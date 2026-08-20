import type { AlertLocation, AzureProject, AzureRepository, RawGhasAlert } from '../types/ghas'
import type { SourceSnippet } from './sourceReader'
import { DEFAULT_CONTEXT_RADIUS } from '../utils/snippetUtils'

interface AzureListResponse<T> {
  value?: T[]
}

interface AzureItemsResponse {
  content?: string
}

interface AzureAlertFetchContext {
  org: string
  pat: string
  projectName: string
  projectId: string
  repoId: string
  repoName: string
  ref: string
}

interface AzureSourceContext {
  org: string
  pat: string
  project: string
  repoId: string
  filePath: string
  ref: string
  fallbackRef?: string
}

const API_VERSION_PROJECTS = '7.1-preview.4'
const API_VERSION_REPOSITORIES = '7.1-preview.1'
const API_VERSION_ITEMS = '7.1-preview.1'

const ALERT_TYPES: Array<{ label: string; value: number }> = [
  { label: 'CodeQL', value: 3 },
  { label: 'Advanced Security Secrets Scanning', value: 2 },
  { label: 'Advanced Security Dependency Scanning', value: 1 },
]

export const AZURE_ALERT_ENDPOINT_TOTAL = ALERT_TYPES.length

interface JsonRequestResult {
  status: number
  headers: Headers
  response: unknown
  statusText: string
}

const toErrorMessage = (result: JsonRequestResult): string => {
  const prefix = `HTTP ${result.status}: `
  if (typeof result.response === 'string') {
    return prefix + (result.response.slice(0, 400) || result.statusText || 'Request failed.')
  }

  if (result.response && typeof result.response === 'object') {
    const payload = result.response as { message?: unknown }
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return prefix + (payload.message.slice(0, 400))
    }

    try {
      return prefix + (JSON.stringify(result.response).slice(0, 400))
    } catch {
      // Fall back to the HTTP status text for an unexpectedly non-serializable body.
    }
  }

  return prefix + (result.statusText || 'Request failed.')
}

const parseResponse = (status: number, text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    if (status === 203 && text.trimStart().startsWith('<')) {
      throw new Error(
        'Invalid or expired PAT – the server returned an HTML page instead of JSON. Check your Personal Access Token and organization name.',
      )
    } else if (status >= 200 && status < 300) {
      throw new Error(`Response is not valid JSON: ${text.slice(0, 200)}`)
    }

    return text
  }
}

const fetchWithAuth = async (url: string, pat: string): Promise<Response> => {
  try {
    return await fetch(url, {
      headers: {
        Authorization: `Basic ${btoa(`:${pat}`)}`,
        Accept: 'application/json',
      },
    })
  } catch (error) {
    throw new Error(
      'Request blocked – the server rejected the connection. Your PAT may be expired or invalid.',
    )
  }
}

const requestJson = async (url: string, pat: string): Promise<JsonRequestResult> => {
  const response = await fetchWithAuth(url, pat)
  const responseText = await response.text()
  const result: JsonRequestResult = {
    status: response.status,
    headers: response.headers,
    response: parseResponse(response.status, responseText),
    statusText: response.statusText,
  }

  if (result.status === 401 || result.status === 403) {
    throw new Error(`Authentication failed – your PAT may be expired or lack the required scopes. ${toErrorMessage(result)}`.trim())
  }

  return result
}

export const listAzureProjects = async (org: string, pat: string): Promise<AzureProject[]> => {
  const url = `https://dev.azure.com/${encodeURIComponent(org)}/_apis/projects?api-version=${API_VERSION_PROJECTS}`
  const result = await requestJson(url, pat)
  if (result.status !== 200) {
    throw new Error(toErrorMessage(result))
  }

  const json = result.response as AzureListResponse<{ id?: string; name?: string }>
  return (json.value ?? [])
    .map((project) => ({
      id: String(project.id ?? ''),
      name: String(project.name ?? ''),
    }))
    .filter((project) => Boolean(project.id) && Boolean(project.name))
}

export const listAzureRepositories = async (
  org: string,
  projectName: string,
  pat: string,
): Promise<AzureRepository[]> => {
  const url = `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(projectName)}/_apis/git/repositories?api-version=${API_VERSION_REPOSITORIES}`
  const result = await requestJson(url, pat)
  if (result.status !== 200) {
    throw new Error(toErrorMessage(result))
  }

  const json = result.response as AzureListResponse<{
    id?: string
    name?: string
    defaultBranch?: string
  }>
  return (json.value ?? [])
    .map((repo) => ({
      id: String(repo.id ?? ''),
      name: String(repo.name ?? ''),
      defaultBranch: String(repo.defaultBranch ?? 'refs/heads/main'),
    }))
    .filter((repo) => Boolean(repo.id) && Boolean(repo.name))
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const isAdvSecDisabledError = (result: JsonRequestResult): boolean => {
  return (
    result.status === 400 &&
    typeof result.response === 'object' && result.response !== null &&
    (
      ('typeKey' in result.response && result.response.typeKey === 'AdvSecNotEnabledException') ||
      ('message' in result.response && result.response.message === 'VS2150009') ||
      ('message' in result.response && result.response.message === 'Advanced Security is not enabled for this repository.')
    )
  )
}

const isToolNotReadyError = (result: JsonRequestResult): boolean => {
  return (
    result.status === 404 &&
    typeof result.response === 'object' && result.response !== null &&
    (
      ('typeKey' in result.response && result.response.typeKey === 'ToolConfigurationMissingException') ||
      ('message' in result.response && result.response.message === 'VS2150003') ||
      ('message' in result.response && result.response.message === 'scanning for the repository is not setup or the first scanning has not finished.')
    )
  )
}

const normalizeList = (items: string[]): string => {
  if (items.length === 0) {
    return ''
  }

  if (items.length === 1) {
    return items[0]
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`
  }

  const lastItem = items.pop()
  return `${items.join(', ')}, and ${lastItem}`
}

export const fetchAzureAlerts = async (
  context: AzureAlertFetchContext,
  onEndpointProgress?: (completed: number, total: number) => void,
): Promise<{ alerts: RawGhasAlert[]; warnings: string[] }> => {
  const warnings: string[] = []
  const allAlerts: RawGhasAlert[] = []
  let completedEndpoints = 0
  let advSecDisabled = false
  let toolNotReady = [];

  onEndpointProgress?.(completedEndpoints, AZURE_ALERT_ENDPOINT_TOTAL)

  const org = encodeURIComponent(context.org)
  const project = encodeURIComponent(context.projectId)
  const repo = encodeURIComponent(context.repoId)
  const base = `https://advsec.dev.azure.com/${org}/${project}/_apis/alert/repositories/${repo}/alerts`

  for (const alertType of ALERT_TYPES) {
    const baseParams = new URLSearchParams({
      top: '500',
      orderBy: 'severity',
      'criteria.alertType': String(alertType.value),
      'criteria.ref': context.ref,
      // 'criteria.states': '1',
    })

    let nextUrl: string | null = `${base}?${baseParams.toString()}`

    try {
      while (nextUrl !== null) {
        const result = await requestJson(nextUrl, context.pat)
        if (result.status !== 200) {
          if (isAdvSecDisabledError(result)) {
            advSecDisabled = true
          } else if (isToolNotReadyError(result)) {
            toolNotReady.push(alertType.label)
          } else {
            warnings.push(`Failed to fetch ${alertType.label} for ${context.repoName} alerts: ${toErrorMessage(result)}.`)
          }
          break;
        }

        const data = result.response as AzureListResponse<RawGhasAlert>
        const page = (data.value ?? []).map((item) => ({
          ...item,
          _repoName: item._repoName ?? context.repoName,
          repositoryId: item.repositoryId ?? context.repoId,
          projectId: item.projectId ?? context.projectId,
          gitRef: item.gitRef ?? context.ref,
        }))
        allAlerts.push(...page)

        const continuationToken = result.headers.get('x-ms-continuationtoken')
        if (continuationToken) {
          const nextParams = new URLSearchParams(baseParams)
          nextParams.set('continuationToken', continuationToken)
          nextUrl = `${base}?${nextParams.toString()}`
        } else {
          nextUrl = null
        }
      }
    } catch (error) {
      warnings.push(`Failed to fetch ${alertType.label} for ${context.repoName} alerts: ${getErrorMessage(error)}.`)
    } finally {
      completedEndpoints += 1
      onEndpointProgress?.(completedEndpoints, AZURE_ALERT_ENDPOINT_TOTAL)
    }

    if (advSecDisabled) {
      break;
    }
  }

  if (advSecDisabled) {
    warnings.push(
      `Advanced Security is not enabled for ${context.repoName}.`,
    )
  }

  if (toolNotReady.length > 0) {
    warnings.push(
      `'${normalizeList(toolNotReady)}' for ${context.repoName} is not set up or its first scan has not finished.`,
    )
  }

  return {
    alerts: allAlerts,
    warnings,
  }
}

const trimRef = (value: string | undefined): string => String(value ?? '').trim()

const expandBranchRefVariants = (value: string | undefined): string[] => {
  const normalized = trimRef(value)
  if (!normalized) return []

  const variants = [normalized]
  if (normalized.startsWith('refs/heads/')) {
    variants.push(normalized.slice('refs/heads/'.length))
  } else if (!normalized.startsWith('refs/')) {
    variants.push(`refs/heads/${normalized}`)
  }

  return Array.from(new Set(variants.map((item) => item.trim()).filter(Boolean)))
}

export const fetchAzureSourceText = async (context: AzureSourceContext): Promise<string | null> => {
  const refsToTry = Array.from(
    new Set([
      ...expandBranchRefVariants(context.ref),
      ...expandBranchRefVariants(context.fallbackRef),
    ]),
  )

  let lastRefError: string | null = null

  for (const ref of refsToTry) {
    const params = new URLSearchParams({
      path: context.filePath,
      includeContent: 'true',
      'versionDescriptor.version': ref,
      'versionDescriptor.versionOptions': 'none',
      'api-version': API_VERSION_ITEMS,
    })

    const url = `https://dev.azure.com/${encodeURIComponent(context.org)}/${encodeURIComponent(context.project)}/_apis/git/repositories/${encodeURIComponent(context.repoId)}/items?${params.toString()}`

    const result = await requestJson(url, context.pat)

    if (result.status === 404) {
      continue
    }

    if (result.status !== 200) {
      const detail = toErrorMessage(result)
      const unresolvedRef =
        detail.includes('GitUnresolvableToCommitException') ||
        detail.includes('could not be resolved to a version')

      if (unresolvedRef) {
        lastRefError = detail
        continue
      }

      throw new Error(detail)
    }

    const json = result.response as AzureItemsResponse
    if (typeof json.content === 'string') {
      return json.content
    }
  }

  if (lastRefError) {
    throw new Error(lastRefError)
  }

  return null
}

export const buildSourceSnippet = (
  filePath: string,
  content: string,
  location: AlertLocation,
  contextRadius = DEFAULT_CONTEXT_RADIUS,
): SourceSnippet => {
  const allLines = content.split(/\r?\n/)
  const focusLine = Math.max(location.lineStart ?? 1, 1)
  const focusColumnStart = Math.max(location.columnStart ?? 1, 1)
  const focusColumnEnd = Math.max(location.columnEnd ?? focusColumnStart, focusColumnStart)
  const startLine = Math.max(focusLine - contextRadius, 1)
  const endLine = Math.min(focusLine + contextRadius, allLines.length)

  return {
    resolvedPath: filePath,
    startLine,
    focusLine,
    focusColumnStart,
    focusColumnEnd,
    endLine,
    lines: allLines.slice(startLine - 1, endLine),
  }
}
