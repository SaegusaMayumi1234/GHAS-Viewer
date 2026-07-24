import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { parseGhasFile } from '../services/ghasParser'
import { AlertSearchIndex } from '../services/searchIndex'
import { LocalSourceReader, type SourceSnippet } from '../services/sourceReader'
import {
  AZURE_ALERT_ENDPOINT_TOTAL,
  buildSourceSnippet,
  fetchAzureAlerts,
  fetchAzureSourceText,
  listAzureProjects,
  listAzureRepositories,
} from '../services/azureDevOpsClient'
import type {
  AzureProject,
  AzureRepository,
  DataSourceMode,
  FilterState,
  NormalizedGhasAlert,
  SeverityLevel,
} from '../types/ghas'

const normalize = (value: string): string => value.trim().toLowerCase()

const DEFAULT_FILTERS: FilterState = {
  severities: [],
  states: [],
  repositoryName: '',
  toolName: '',
  alertIdQuery: '',
  ruleQuery: '',
  pathQuery: '',
  onlyAutofixable: false,
  hideDuplicateAlerts: false,
}

export const useGhasStore = defineStore('ghas', () => {
  const alerts = shallowRef<NormalizedGhasAlert[]>([])
  const importWarnings = ref<string[]>([])
  const importProgress = ref(0)
  const importTotal = ref(0)
  const isImporting = ref(false)
  const errorMessage = ref('')

  const globalSearch = ref('')
  const filters = ref<FilterState>({ ...DEFAULT_FILTERS })
  const selectedAlertId = ref<string | null>(null)

  const sourceSnippet = ref<SourceSnippet | null>(null)
  const sourceLoading = ref(false)
  const sourceError = ref('')
  const indexingFolder = ref(false)
  const folderFileCount = ref(0)

  const dataSourceMode = ref<DataSourceMode>('file')
  const azureOrg = ref('')
  const azurePat = ref('')
  const azureRef = ref('')
  const azureProjects = ref<AzureProject[]>([])
  const azureRepos = ref<AzureRepository[]>([])
  const selectedAzureProjectId = ref('')
  const selectedAzureRepoId = ref('')
  const azureLoadingProjects = ref(false)
  const azureLoadingRepos = ref(false)
  const azureLoadingAlerts = ref(false)
  const azureConnectionError = ref('')
  const azureWarnings = ref<string[]>([])

  const searchIndex = new AlertSearchIndex()
  const sourceReader = new LocalSourceReader()
  const sourceSnippetCache = new Map<string, SourceSnippet>()

  const selectedAzureProject = computed<AzureProject | null>(() => {
    return azureProjects.value.find((project) => project.id === selectedAzureProjectId.value) ?? null
  })

  const selectedAzureRepo = computed<AzureRepository | null>(() => {
    return azureRepos.value.find((repo) => repo.id === selectedAzureRepoId.value) ?? null
  })

  const severityOptions = computed<SeverityLevel[]>(() => {
    const unique = new Set<SeverityLevel>()
    for (const alert of alerts.value) {
      unique.add(alert.severity)
    }
    return Array.from(unique)
  })

  const stateOptions = computed<string[]>(() => {
    const unique = new Set<string>()
    for (const alert of alerts.value) {
      unique.add(alert.state)
    }
    return Array.from(unique)
  })

  const repositoryOptions = computed<string[]>(() => {
    const unique = new Set<string>()
    for (const alert of alerts.value) {
      unique.add(alert.repositoryName)
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  })

  const toolOptions = computed<string[]>(() => {
    const unique = new Set<string>()
    for (const alert of alerts.value) {
      for (const toolName of alert.toolNames) {
        unique.add(toolName)
      }
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  })

  const selectedAlert = computed(() => {
    if (selectedAlertId.value == null) return null
    return alerts.value.find((alert) => alert.rowKey === selectedAlertId.value) ?? null
  })

  const filteredAlerts = computed(() => {
    const selectedRepository = normalize(filters.value.repositoryName)
    const selectedTool = normalize(filters.value.toolName)
    const alertIdQuery = normalize(filters.value.alertIdQuery)
    const ruleQuery = normalize(filters.value.ruleQuery)
    const pathQuery = normalize(filters.value.pathQuery)

    const searchedRowKeys = new Set<string>()
    const globalQuery = globalSearch.value.trim()
    if (globalQuery.length > 1) {
      for (const result of searchIndex.query(globalQuery)) {
        searchedRowKeys.add(result.rowKey)
      }
    }

    const seenDuplicateSignatures = new Set<string>()

    return alerts.value.filter((alert) => {
      if (globalQuery.length > 1 && !searchedRowKeys.has(alert.rowKey)) return false

      if (filters.value.onlyAutofixable && !alert.isAutoFixable) return false

      if (filters.value.severities.length > 0 && !filters.value.severities.includes(alert.severity)) {
        return false
      }

      if (filters.value.states.length > 0 && !filters.value.states.includes(alert.state)) {
        return false
      }

      if (selectedRepository && alert.repositoryName.toLowerCase() !== selectedRepository) {
        return false
      }

      if (selectedTool) {
        const hasTool = alert.toolNames.some((toolName) => toolName.toLowerCase() === selectedTool)
        if (!hasTool) return false
      }

      if (alertIdQuery && !String(alert.id).includes(alertIdQuery)) {
        return false
      }

      if (ruleQuery) {
        const mergedRules = `${alert.ruleIds.join(' ')} ${alert.ruleNames.join(' ')}`.toLowerCase()
        if (!mergedRules.includes(ruleQuery)) return false
      }

      if (pathQuery) {
        const mergedPaths = alert.locations.map((location) => location.filePath.toLowerCase()).join(' ')
        if (!mergedPaths.includes(pathQuery)) return false
      }

      if (filters.value.hideDuplicateAlerts) {
        const primaryLocation = alert.locations[0]
        const duplicateSignature = [
          normalize(alert.repositoryName),
          String(alert.id),
          normalize(alert.title),
          normalize(alert.state),
          alert.severity,
          normalize(primaryLocation?.filePath ?? ''),
          String(primaryLocation?.lineStart ?? ''),
          normalize(alert.ruleIds.join('|')),
        ].join('::')

        if (seenDuplicateSignatures.has(duplicateSignature)) return false
        seenDuplicateSignatures.add(duplicateSignature)
      }

      return true
    })
  })

  const stats = computed(() => {
    const totalsBySeverity = filteredAlerts.value.reduce<Record<string, number>>((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] ?? 0) + 1
      return acc
    }, {})

    return {
      totalImported: alerts.value.length,
      totalFiltered: filteredAlerts.value.length,
      totalsBySeverity,
    }
  })

  const connectFolder = async (): Promise<void> => {
    if (dataSourceMode.value === 'azure') {
      sourceError.value = 'Local folder source preview is disabled while Azure DevOps mode is active.'
      return
    }

    sourceError.value = ''
    indexingFolder.value = true
    try {
      await sourceReader.connect()
      await sourceReader.buildIndex((count) => {
        folderFileCount.value = count
      })
    } catch (error) {
      sourceReader.disconnect()
      sourceError.value = error instanceof Error ? error.message : 'Unable to connect folder.'
      throw error
    } finally {
      indexingFolder.value = false
    }
  }

  const disconnectFolder = (): void => {
    sourceReader.disconnect()
    folderFileCount.value = 0
    sourceSnippet.value = null
    sourceError.value = ''
  }

  const loadAlertSourceSnippet = async (): Promise<void> => {
    sourceSnippet.value = null
    sourceError.value = ''

    const alert = selectedAlert.value
    if (!alert || alert.locations.length === 0) return

    const primaryLocation = alert.locations[0]
    if (!primaryLocation || !primaryLocation.filePath || primaryLocation.lineStart == null) {
      return
    }

    if (dataSourceMode.value === 'azure') {
      const projectName = selectedAzureProject.value?.name
      const repoId = alert.raw.repositoryId || selectedAzureRepoId.value
      const alertRef = alert.gitRef?.trim() ?? ''
      const selectedRef = azureRef.value.trim()
      const resolvedRef = alertRef || selectedRef

      if (!projectName || !repoId || !resolvedRef) {
        sourceError.value = 'Missing project, repository, or reference for Azure source preview.'
        return
      }

      if (!azureOrg.value || !azurePat.value) {
        sourceError.value = 'Azure credentials are unavailable. Reconnect and try again.'
        return
      }

      const cacheKey = [
        repoId,
        resolvedRef,
        primaryLocation.filePath,
        String(primaryLocation.lineStart ?? ''),
        String(primaryLocation.columnStart ?? ''),
      ].join('::')

      const cached = sourceSnippetCache.get(cacheKey)
      if (cached) {
        sourceSnippet.value = cached
        return
      }

      sourceLoading.value = true
      try {
        const content = await fetchAzureSourceText({
          org: azureOrg.value,
          pat: azurePat.value,
          project: projectName,
          repoId,
          filePath: primaryLocation.filePath,
          ref: resolvedRef,
          fallbackRef: selectedRef && selectedRef !== resolvedRef ? selectedRef : undefined,
        })

        if (!content) {
          sourceError.value = `Source file was not found for ref ${resolvedRef}.`
          return
        }

        const snippet = buildSourceSnippet(primaryLocation.filePath, content, primaryLocation)
        sourceSnippet.value = snippet
        sourceSnippetCache.set(cacheKey, snippet)
      } catch (error) {
        sourceError.value = error instanceof Error ? error.message : 'Failed to load source from Azure DevOps.'
      } finally {
        sourceLoading.value = false
      }
      return
    }

    if (!sourceReader.hasFolder || !sourceReader.isIndexed) {
      sourceError.value = 'Connect a project folder to preview source context.'
      return
    }

    sourceLoading.value = true
    try {
      const snippet = await sourceReader.readSnippet(primaryLocation)
      if (!snippet) {
        sourceError.value = 'Source file could not be resolved from the connected folder.'
        return
      }

      sourceSnippet.value = snippet
    } catch (error) {
      sourceError.value = error instanceof Error ? error.message : 'Failed to read source file.'
    } finally {
      sourceLoading.value = false
    }
  }

  const setDataSourceMode = (mode: DataSourceMode): void => {
    dataSourceMode.value = mode
    sourceError.value = ''
    sourceSnippet.value = null
    sourceSnippetCache.clear()
  }

  const setAzureCredentials = (org: string, pat: string): void => {
    const nextOrg = org.trim()
    const nextPat = pat.trim()
    const hasChanged = nextOrg !== azureOrg.value || nextPat !== azurePat.value

    azureOrg.value = nextOrg
    azurePat.value = nextPat
    azureConnectionError.value = ''

    if (hasChanged) {
      azureProjects.value = []
      azureRepos.value = []
      selectedAzureProjectId.value = ''
      selectedAzureRepoId.value = ''
      azureRef.value = ''
      azureWarnings.value = []
    }
  }

  const loadAzureProjects = async (): Promise<void> => {
    if (!azureOrg.value || !azurePat.value) {
      azureConnectionError.value = 'Organization and PAT are required.'
      return
    }

    azureLoadingProjects.value = true
    azureConnectionError.value = ''
    azureWarnings.value = []

    try {
      const projects = await listAzureProjects(azureOrg.value, azurePat.value)
      const hasSelectedProject = projects.some((project) => project.id === selectedAzureProjectId.value)

      azureProjects.value = projects

      if (!hasSelectedProject) {
        selectedAzureProjectId.value = ''
        selectedAzureRepoId.value = ''
        azureRepos.value = []
        azureRef.value = ''
      }
    } catch (error) {
      azureConnectionError.value = error instanceof Error ? error.message : 'Failed to load Azure projects.'
    } finally {
      azureLoadingProjects.value = false
    }
  }

  const selectAzureProject = (projectId: string): void => {
    if (projectId === selectedAzureProjectId.value) {
      return
    }

    selectedAzureProjectId.value = projectId
    selectedAzureRepoId.value = ''
    azureRepos.value = []
    azureRef.value = ''
    azureWarnings.value = []
  }

  const loadAzureRepos = async (): Promise<void> => {
    const project = selectedAzureProject.value
    if (!project) {
      azureConnectionError.value = 'Select a project before loading repositories.'
      return
    }

    azureLoadingRepos.value = true
    azureConnectionError.value = ''

    try {
      const repos = await listAzureRepositories(azureOrg.value, project.name, azurePat.value)
      const hasSelectedRepo = repos.some((repo) => repo.id === selectedAzureRepoId.value)

      azureRepos.value = repos

      if (!hasSelectedRepo) {
        selectedAzureRepoId.value = ''
        azureRef.value = ''
      }
    } catch (error) {
      azureConnectionError.value = error instanceof Error ? error.message : 'Failed to load repositories.'
    } finally {
      azureLoadingRepos.value = false
    }
  }

  const selectAzureRepo = (repoId: string): void => {
    if (repoId === selectedAzureRepoId.value) {
      return
    }

    selectedAzureRepoId.value = repoId
    const repo = azureRepos.value.find((item) => item.id === repoId)
    azureRef.value = repo?.defaultBranch ?? ''
  }

  const setAzureRef = (nextRef: string): void => {
    azureRef.value = nextRef.trim()
  }

  const clearAzureFeedback = (): void => {
    azureConnectionError.value = ''
    azureWarnings.value = []
    importWarnings.value = []
    if (dataSourceMode.value === 'azure') {
      errorMessage.value = ''
    }
  }

  const fetchAlertsFromAzure = async (): Promise<boolean> => {
    const project = selectedAzureProject.value
    const repo = selectedAzureRepo.value

    if (!azureOrg.value || !azurePat.value) {
      azureConnectionError.value = 'Organization and PAT are required.'
      return false
    }
    if (!project || !repo) {
      azureConnectionError.value = 'Select both project and repository before fetching alerts.'
      return false
    }

    const resolvedRef = azureRef.value || repo.defaultBranch
    if (!resolvedRef) {
      azureConnectionError.value = 'Reference is required to fetch alerts.'
      return false
    }

    azureLoadingAlerts.value = true
    isImporting.value = true
    importProgress.value = 0
    importTotal.value = AZURE_ALERT_ENDPOINT_TOTAL + 1
    errorMessage.value = ''
    azureConnectionError.value = ''
    importWarnings.value = []
    azureWarnings.value = []
    sourceSnippet.value = null
    sourceSnippetCache.clear()

    try {
      const response = await fetchAzureAlerts({
        org: azureOrg.value,
        pat: azurePat.value,
        projectName: project.name,
        projectId: project.id,
        repoId: repo.id,
        repoName: repo.name,
        ref: resolvedRef,
      }, (completed, total) => {
        importTotal.value = total + 1
        importProgress.value = completed
      })

      importProgress.value = AZURE_ALERT_ENDPOINT_TOTAL
      const parsed = await parseGhasFile(JSON.stringify(response.alerts))
      importProgress.value = importTotal.value

      alerts.value = parsed.alerts
      searchIndex.build(parsed.alerts)
      selectedAlertId.value = null
      importWarnings.value = parsed.stats.warnings
      azureWarnings.value = response.warnings
      dataSourceMode.value = 'azure'
      azureRef.value = resolvedRef
      folderFileCount.value = 0
      sourceReader.disconnect()
      resetFilters()
      return true
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to fetch alerts from Azure DevOps.'
      return false
    } finally {
      isImporting.value = false
      azureLoadingAlerts.value = false
    }
  }

  const importFromText = async (jsonText: string): Promise<void> => {
    isImporting.value = true
    errorMessage.value = ''
    importWarnings.value = []

    try {
      const result = await parseGhasFile(jsonText, (processed, total) => {
        importProgress.value = processed
        importTotal.value = total
      })
      alerts.value = result.alerts
      importWarnings.value = result.stats.warnings
      searchIndex.build(result.alerts)
      selectedAlertId.value = null
      sourceSnippet.value = null
      sourceSnippetCache.clear()
      dataSourceMode.value = 'file'
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Unable to import GHAS file.'
    } finally {
      isImporting.value = false
    }
  }

  const importFromFile = async (file: File): Promise<void> => {
    const text = await file.text()
    await importFromText(text)
  }

  const resetFilters = (): void => {
    filters.value = { ...DEFAULT_FILTERS }
    globalSearch.value = ''
  }

  const openAlertDetails = async (alertKey: string): Promise<void> => {
    selectedAlertId.value = alertKey
    await loadAlertSourceSnippet()
  }

  const closeAlertDetails = (): void => {
    selectedAlertId.value = null
    sourceSnippet.value = null
    sourceError.value = ''
  }

  return {
    alerts,
    stats,
    isImporting,
    importProgress,
    importTotal,
    importWarnings,
    errorMessage,
    globalSearch,
    filters,
    filteredAlerts,
    severityOptions,
    stateOptions,
    repositoryOptions,
    toolOptions,
    selectedAlert,
    selectedAlertId,
    sourceSnippet,
    sourceLoading,
    sourceError,
    dataSourceMode,
    azureOrg,
    azurePat,
    azureRef,
    azureProjects,
    azureRepos,
    selectedAzureProjectId,
    selectedAzureRepoId,
    selectedAzureProject,
    selectedAzureRepo,
    azureLoadingProjects,
    azureLoadingRepos,
    azureLoadingAlerts,
    azureConnectionError,
    azureWarnings,
    indexingFolder,
    folderFileCount,
    importFromFile,
    importFromText,
    setDataSourceMode,
    setAzureCredentials,
    loadAzureProjects,
    selectAzureProject,
    loadAzureRepos,
    selectAzureRepo,
    setAzureRef,
    clearAzureFeedback,
    fetchAlertsFromAzure,
    connectFolder,
    disconnectFolder,
    openAlertDetails,
    closeAlertDetails,
    resetFilters,
  }
})
