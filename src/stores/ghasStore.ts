import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { parseGhasFile } from '../services/ghasParser'
import { AlertSearchIndex } from '../services/searchIndex'
import { LocalSourceReader, type SourceSnippet } from '../services/sourceReader'
import type { FilterState, NormalizedGhasAlert, SeverityLevel } from '../types/ghas'

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

  const searchIndex = new AlertSearchIndex()
  const sourceReader = new LocalSourceReader()

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
    indexingFolder,
    folderFileCount,
    importFromFile,
    importFromText,
    connectFolder,
    disconnectFolder,
    openAlertDetails,
    closeAlertDetails,
    resetFilters,
  }
})
