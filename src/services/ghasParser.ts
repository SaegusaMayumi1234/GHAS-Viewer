import type { GhasLogicalLocation, ImportResult, NormalizedGhasAlert, RawGhasAlert, SeverityLevel } from '../types/ghas'

const KNOWN_SEVERITY: SeverityLevel[] = ['critical', 'high', 'medium', 'low', 'warning', 'note', 'unknown']

const toStringValue = (value: unknown): string => {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

const normalizeSeverity = (severity: unknown): SeverityLevel => {
  const normalized = toStringValue(severity).toLowerCase()
  return KNOWN_SEVERITY.includes(normalized as SeverityLevel) ? (normalized as SeverityLevel) : 'unknown'
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const collectPrimitiveValues = (input: unknown, bucket: string[]): void => {
  if (input == null) return
  if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
    bucket.push(String(input))
    return
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      collectPrimitiveValues(item, bucket)
    }
    return
  }

  if (isRecord(input)) {
    for (const value of Object.values(input)) {
      collectPrimitiveValues(value, bucket)
    }
  }
}

const yieldToMainThread = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })
}

const buildRowKey = (
  repositoryName: string,
  alertId: number,
  locations: Array<{ filePath: string; lineStart?: number; columnStart?: number }>,
  index: number,
): string => {
  const primaryLocation = locations[0]
  const locationKey = primaryLocation
    ? `${primaryLocation.filePath}:${primaryLocation.lineStart ?? 'na'}:${primaryLocation.columnStart ?? 'na'}`
    : 'no-location'

  return `${repositoryName}::${alertId}::${locationKey}::${index}`
}

const normalizeLogicalLocations = (logicalLocations: GhasLogicalLocation[]): GhasLogicalLocation[] => {
  const roots = logicalLocations.filter((loc) => loc.kind === 'rootDependency').reverse()
  const others = logicalLocations.filter((loc) => loc.kind !== 'rootDependency')
  const seen = new Set<string>()
  const dedupedRoots = roots.filter((loc) => {
    const key = loc.fullyQualifiedName ?? ''
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return [...dedupedRoots, ...others]
}

export const parseGhasFile = async (
  rawText: string,
  onProgress?: (processed: number, total: number) => void,
): Promise<ImportResult> => {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error('Invalid JSON file. Please import a valid GHAS export.')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Unsupported GHAS format. Expected a top-level array of alerts.')
  }

  const warnings: string[] = []
  const alerts: NormalizedGhasAlert[] = []
  const total = parsed.length
  let invalid = 0

  onProgress?.(0, total)

  for (let index = 0; index < total; index += 1) {
    const item = parsed[index]
    if (!isRecord(item)) {
      invalid += 1
      continue
    }

    const raw = item as RawGhasAlert
    if (raw.alertId == null || raw.title == null) {
      invalid += 1
      continue
    }

    const tools = Array.isArray(raw.tools) ? raw.tools : []
    const toolNames = tools.map((tool) => toStringValue(tool.name)).filter(Boolean)
    const allRules = tools.flatMap((tool) => (Array.isArray(tool.rules) ? tool.rules : []))

    const ruleIds = allRules.map((rule) => toStringValue(rule.opaqueId)).filter(Boolean)
    const ruleNames = allRules
      .map((rule) => toStringValue(rule.friendlyName || rule.opaqueId))
      .filter(Boolean)
    const ruleDescriptions = allRules.map((rule) => toStringValue(rule.description)).filter(Boolean)
    const helpMessages = allRules.map((rule) => toStringValue(rule.helpMessage)).filter(Boolean)
    const resources = allRules.map((rule) => toStringValue(rule.resources)).filter(Boolean)
    const tags = allRules.flatMap((rule) => (Array.isArray(rule.tags) ? rule.tags : [])).map(String)

    const locations = (Array.isArray(raw.physicalLocations) ? raw.physicalLocations : []).flatMap((location) => {
      const filePath = toStringValue(location.filePath)
      const region = location.region
      if (!filePath) return []

      return [
        {
          filePath,
          lineStart: region?.lineStart,
          lineEnd: region?.lineEnd,
          columnStart: region?.columnStart,
          columnEnd: region?.columnEnd,
        },
      ]
    })

    const logicalLocations = normalizeLogicalLocations((Array.isArray(raw.logicalLocations) ? raw.logicalLocations : []).filter(
      (loc): loc is GhasLogicalLocation =>
        isRecord(loc) && (typeof loc.fullyQualifiedName === 'string' || typeof loc.kind === 'string'),
    ))

    const searchBucket: string[] = []
    collectPrimitiveValues(raw, searchBucket)

    const repositoryName = toStringValue(raw._repoName || 'unknown-repository') || 'unknown-repository'
    const alertId = Number(raw.alertId)

    alerts.push({
      rowKey: buildRowKey(repositoryName, alertId, locations, index),
      id: alertId,
      severity: normalizeSeverity(raw.severity),
      title: toStringValue(raw.title),
      state: toStringValue(raw.state || 'unknown') || 'unknown',
      repositoryName,
      repositoryUrl: toStringValue(raw.repositoryUrl),
      gitRef: toStringValue(raw.gitRef),
      alertType: toStringValue(raw.alertType),
      firstSeenDate: toStringValue(raw.firstSeenDate),
      lastSeenDate: toStringValue(raw.lastSeenDate),
      fixedDate: toStringValue(raw.fixedDate),
      introducedDate: toStringValue(raw.introducedDate),
      hasTrustedSourceOrigin: Boolean(raw.hasTrustedSourceOrigin),
      isAutoFixable: Boolean(raw.isAutoFixable),
      locations,
      logicalLocations,
      toolNames,
      ruleIds,
      ruleNames,
      helpMessages,
      ruleDescriptions,
      resources,
      tags,
      indexedText: searchBucket.join(' ').toLowerCase(),
      raw,
    })

    if (index > 0 && index % 50 === 0) {
      onProgress?.(index + 1, total)
      await yieldToMainThread()
    }
  }

  if (invalid > 0) {
    warnings.push(`${invalid} entries were ignored due to missing required fields.`)
  }

  onProgress?.(total, total)

  return {
    alerts,
    stats: {
      total,
      invalid,
      warnings,
    },
  }
}
