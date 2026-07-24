export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'warning' | 'note' | 'unknown'

export interface GhasRule {
  opaqueId?: string
  friendlyName?: string
  description?: string
  resources?: string
  helpMessage?: string
  tags?: string[]
}

export interface GhasTool {
  name?: string
  rules?: GhasRule[]
}

export interface GhasRegion {
  lineStart?: number
  lineEnd?: number
  columnStart?: number
  columnEnd?: number
}

export interface GhasPhysicalLocation {
  filePath?: string
  isValidGitPath?: boolean
  region?: GhasRegion
}

export interface RawGhasAlert {
  alertId?: number
  severity?: string
  title?: string
  tools?: GhasTool[]
  dismissal?: unknown
  repositoryId?: string | null
  projectId?: string | null
  repositoryUrl?: string
  gitRef?: string
  alertType?: string
  firstSeenDate?: string
  lastSeenDate?: string
  fixedDate?: string | null
  introducedDate?: string
  state?: string
  physicalLocations?: GhasPhysicalLocation[]
  logicalLocations?: unknown[]
  hasTrustedSourceOrigin?: boolean
  isAutoFixable?: boolean
  _repoName?: string
}

export interface AlertLocation {
  filePath: string
  lineStart?: number
  lineEnd?: number
  columnStart?: number
  columnEnd?: number
}

export interface NormalizedGhasAlert {
  rowKey: string
  id: number
  severity: SeverityLevel
  title: string
  state: string
  repositoryName: string
  repositoryUrl: string
  gitRef: string
  alertType: string
  firstSeenDate: string
  lastSeenDate: string
  fixedDate: string
  introducedDate: string
  hasTrustedSourceOrigin: boolean
  isAutoFixable: boolean
  locations: AlertLocation[]
  toolNames: string[]
  ruleIds: string[]
  ruleNames: string[]
  ruleDescriptions: string[]
  helpMessages: string[]
  resources: string[]
  tags: string[]
  indexedText: string
  raw: RawGhasAlert
}

export interface ImportResult {
  alerts: NormalizedGhasAlert[]
  stats: {
    total: number
    invalid: number
    warnings: string[]
  }
}

export interface FilterState {
  severities: SeverityLevel[]
  states: string[]
  repositoryName: string
  toolName: string
  alertIdQuery: string
  ruleQuery: string
  pathQuery: string
  onlyAutofixable: boolean
  hideDuplicateAlerts: boolean
}

export interface SearchHit {
  rowKey: string
  score?: number
}

export type DataSourceMode = 'file' | 'azure'

export interface AzureProject {
  id: string
  name: string
}

export interface AzureRepository {
  id: string
  name: string
  defaultBranch: string
}


