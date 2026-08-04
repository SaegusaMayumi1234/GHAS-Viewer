import type { AlertLocation, AzureProject, AzureRepository, RawGhasAlert } from '../types/ghas'
import type { SourceSnippet } from './sourceReader'

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

const ALERT_TYPES: Array<{ label: string; value: number }> = [
  { label: 'code', value: 3 },
  { label: 'secret', value: 2 },
  { label: 'dependency', value: 1 },
]

export const AZURE_ALERT_ENDPOINT_TOTAL = ALERT_TYPES.length

const toErrorMessage = async (response: Response): Promise<string> => {
  const text = await response.text()
  if (!text) return response.statusText || 'Request failed.'
  return text.slice(0, 400)
}

const buildAuthHeader = (pat: string): string => {
  const encoded = btoa(`:${pat}`)
  return `Basic ${encoded}`
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

const requestJson = async <T>(url: string, pat: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Authorization: buildAuthHeader(pat),
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const detail = await toErrorMessage(response)
    throw new Error(`HTTP ${response.status}: ${detail}`)
  }

  return (await response.json()) as T
}

interface JsonWithContinuation<T> {
  data: T
  continuationToken: string | null
}

const requestJsonWithContinuation = async <T>(
  url: string,
  pat: string,
): Promise<JsonWithContinuation<T>> => {
  const response = await fetch(url, {
    headers: {
      Authorization: buildAuthHeader(pat),
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const detail = await toErrorMessage(response)
    throw new Error(`HTTP ${response.status}: ${detail}`)
  }

  const data = (await response.json()) as T
  const continuationToken = response.headers.get('x-ms-continuationtoken')
  return { data, continuationToken }
}

export const listAzureProjects = async (org: string, pat: string): Promise<AzureProject[]> => {
  const url = `https://dev.azure.com/${encodeURIComponent(org)}/_apis/projects?api-version=7.1-preview.4`
  const json = await requestJson<AzureListResponse<{ id?: string; name?: string }>>(url, pat)

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
  const url = `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(projectName)}/_apis/git/repositories?api-version=7.1-preview.1`
  const json = await requestJson<
    AzureListResponse<{ id?: string; name?: string; defaultBranch?: string }>
  >(url, pat)

  return (json.value ?? [])
    .map((repo) => ({
      id: String(repo.id ?? ''),
      name: String(repo.name ?? ''),
      defaultBranch: String(repo.defaultBranch ?? 'refs/heads/main'),
    }))
    .filter((repo) => Boolean(repo.id) && Boolean(repo.name))
}

const isAdvSecDisabledError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('AdvSecNotEnabledException') ||
    message.includes('Advanced Security is not enabled')
  )
}

export const fetchAzureAlerts = async (
  context: AzureAlertFetchContext,
  onEndpointProgress?: (completed: number, total: number) => void,
): Promise<{ alerts: RawGhasAlert[]; warnings: string[] }> => {
  const warnings: string[] = []
  const allAlerts: RawGhasAlert[] = []
  let completedEndpoints = 0

  onEndpointProgress?.(completedEndpoints, AZURE_ALERT_ENDPOINT_TOTAL)

  const buildAlertCandidates = (
    projectSegment: string,
    repoId: string,
    params: URLSearchParams,
  ): string[] => {
    const org = encodeURIComponent(context.org)
    const project = encodeURIComponent(projectSegment)
    const repo = encodeURIComponent(repoId)
    const query = params.toString()

    return [
      `https://advsec.dev.azure.com/${org}/${project}/_apis/Alert/repositories/${repo}/alerts?${query}`,
      `https://advsec.dev.azure.com/${org}/${project}/_apis/alert/repositories/${repo}/alerts?${query}`,
      `https://dev.azure.com/${org}/${project}/_apis/Alert/repositories/${repo}/alerts?${query}`,
      `https://dev.azure.com/${org}/${project}/_apis/alert/repositories/${repo}/alerts?${query}`,
    ]
  }

  for (const alertType of ALERT_TYPES) {
    const fetchForProjectSegment = async (projectSegment: string): Promise<RawGhasAlert[]> => {
      let lastError: unknown = null

      const baseParams = new URLSearchParams({
        top: '500',
        orderBy: 'severity',
        'criteria.alertType': String(alertType.value),
        'criteria.ref': context.ref,
        'criteria.states': '1',
      })

      const candidates = buildAlertCandidates(projectSegment, context.repoId, baseParams)

      for (const candidateUrl of candidates) {
        try {
          const collected: RawGhasAlert[] = []
          let nextUrl: string | null = candidateUrl

          while (nextUrl !== null) {
            const { data, continuationToken } = await requestJsonWithContinuation<AzureListResponse<RawGhasAlert>>(
              nextUrl,
              context.pat,
            )

            const page = (data.value ?? []).map((item) => ({
              ...item,
              _repoName: item._repoName ?? context.repoName,
              repositoryId: item.repositoryId ?? context.repoId,
              projectId: item.projectId ?? context.projectId,
              gitRef: item.gitRef ?? context.ref,
            }))
            collected.push(...page)

            if (continuationToken) {
              const nextParams = new URLSearchParams(baseParams)
              nextParams.set('continuationToken', continuationToken)
              // Replace the query string on the same base URL (scheme + host + path)
              const base = candidateUrl.split('?')[0]
              nextUrl = `${base}?${nextParams.toString()}`
            } else {
              nextUrl = null
            }
          }

          return collected
        } catch (error) {
          lastError = error
        }
      }

      throw lastError instanceof Error ? lastError : new Error('No compatible alert endpoint variant succeeded.')
    }

    try {
      const projectSegments = Array.from(
        new Set([context.projectId, context.projectName].map((segment) => segment.trim()).filter(Boolean)),
      )

      let alerts: RawGhasAlert[] | null = null
      let lastError: unknown = null

      for (const segment of projectSegments) {
        try {
          alerts = await fetchForProjectSegment(segment)
          break
        } catch (error) {
          lastError = error
        }
      }

      if (!alerts) {
        throw lastError instanceof Error ? lastError : new Error('Unable to fetch alerts for any project route variant.')
      }

      allAlerts.push(...alerts)
    } catch (error) {
      if (isAdvSecDisabledError(error)) {
        warnings.push(`Advanced Security is not enabled for ${context.repoName}; ${alertType.label} alerts skipped.`)
      } else {
        const message = error instanceof Error ? error.message : String(error)
        warnings.push(
          `Failed to fetch ${alertType.label} alerts: ${message}. Tried advsec/dev.azure hosts and Alert/alert controller casing.`,
        )
      }
    } finally {
      completedEndpoints += 1
      onEndpointProgress?.(completedEndpoints, AZURE_ALERT_ENDPOINT_TOTAL)
    }
  }

  return {
    alerts: allAlerts,
    warnings,
  }
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
      'api-version': '7.1-preview.1',
    })

    const url = `https://dev.azure.com/${encodeURIComponent(context.org)}/${encodeURIComponent(context.project)}/_apis/git/repositories/${encodeURIComponent(context.repoId)}/items?${params.toString()}`

    const response = await fetch(url, {
      headers: {
        Authorization: buildAuthHeader(context.pat),
        Accept: 'application/json',
      },
    })

    if (response.status === 404) {
      continue
    }

    if (!response.ok) {
      const detail = await toErrorMessage(response)
      const unresolvedRef =
        detail.includes('GitUnresolvableToCommitException') ||
        detail.includes('could not be resolved to a version')

      if (unresolvedRef) {
        lastRefError = detail
        continue
      }

      throw new Error(`HTTP ${response.status}: ${detail}`)
    }

    const json = (await response.json()) as AzureItemsResponse
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
  contextRadius = 6,
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
