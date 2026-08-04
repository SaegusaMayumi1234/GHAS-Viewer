<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ProgressBar from 'primevue/progressbar'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import { storeToRefs } from 'pinia'
import TopNav from './components/TopNav.vue'
import FilterPanel from './components/FilterPanel.vue'
import AlertTable from './components/AlertTable.vue'
import AlertDetailDialog from './components/AlertDetailDialog.vue'
import AzureImportDialog from './components/AzureImportDialog.vue'
import { useGhasStore } from './stores/ghasStore'

const toast = useToast()
const store = useGhasStore()
const {
  filteredAlerts,
  stats,
  isImporting,
  importProgress,
  importTotal,
  importWarnings,
  errorMessage,
  dataSourceMode,
  indexingFolder,
  folderFileCount,
} = storeToRefs(store)

const fileInputRef = ref<HTMLInputElement | null>(null)
const azureDialogVisible = ref(false)

const openImportPicker = (): void => {
  fileInputRef.value?.click()
}

const onImportFile = async (event: Event): Promise<void> => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  await store.importFromFile(file)
  target.value = ''
}

const openAzureWizard = (): void => {
  azureDialogVisible.value = true
}

const connectFolder = async (): Promise<void> => {
  try {
    await store.connectFolder()
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unable to connect project folder.'
    toast.add({
      severity: 'error',
      summary: 'Project folder unavailable',
      detail: reason,
      life: 6500,
    })
  }
}

const statusCards = computed(() => {
  const critical = filteredAlerts.value.filter((alert) => alert.severity === 'critical').length
  const high = filteredAlerts.value.filter((alert) => alert.severity === 'high').length
  const medium = filteredAlerts.value.filter((alert) => alert.severity === 'medium').length
  const low = filteredAlerts.value.filter((alert) => alert.severity === 'low').length
  const autoFixable = filteredAlerts.value.filter((alert) => alert.isAutoFixable).length
  const repos = new Set(filteredAlerts.value.map((alert) => alert.repositoryName)).size

  return [
    { label: 'Loaded', value: stats.value.totalImported, type: 'loaded' },
    { label: 'Filtered', value: stats.value.totalFiltered, type: 'filtered' },
    { label: 'Auto-Fixable', value: autoFixable, type: 'autofixable' },
    { label: 'Repos', value: repos, type: 'repos' },
    { label: 'Critical', value: critical, type: 'critical' },
    { label: 'High', value: high, type: 'high' },
    { label: 'Medium', value: medium, type: 'medium' },
    { label: 'Low', value: low, type: 'low' },
  ]
})

const totalWarnings = computed(() => importWarnings.value.length)

const exportJson = (): void => {
  if (filteredAlerts.value.length === 0) {
    toast.add({ severity: 'warn', summary: 'Nothing to export', detail: 'No alerts are currently shown in the table.', life: 4000 })
    return
  }
  const json = JSON.stringify(filteredAlerts.value.map(a => a.raw), null, 2)
  const date = new Date().toISOString().slice(0, 10)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ghas-alerts-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="app-shell">
    <TopNav />
    <Toast position="top-right" />

    <input
      ref="fileInputRef"
      type="file"
      accept="application/json"
      class="visually-hidden"
      @change="onImportFile"
    />

    <main class="content">
      <section class="hero-panel">
        <div>
          <h2 class="hero-panel__title">Security posture at a glance</h2>
          <p class="hero-panel__subtitle">
            Explore alert trends, drill into root causes, and move from triage to remediation faster.
          </p>
        </div>

        <div class="hero-panel__facts">
          <article class="fact-chip">
            <span>Active alerts</span>
            <strong>{{ stats.totalFiltered }}</strong>
          </article>
          <article class="fact-chip">
            <span>Total imported</span>
            <strong>{{ stats.totalImported }}</strong>
          </article>
          <article class="fact-chip">
            <span>Open critical</span>
            <strong>{{ statusCards.find((card) => card.type === 'critical')?.value ?? 0 }}</strong>
          </article>
          <article class="fact-chip">
            <span>Import warnings</span>
            <strong>{{ totalWarnings }}</strong>
          </article>
        </div>
      </section>

      <section class="action-panel">
        <div class="action-panel__text action-panel__text--full">
          <p class="action-panel__caption">Azure DevOps direct mode: click connect, then org + PAT -> project -> repository -> load alerts.</p>
          <p class="action-panel__privacy">PAT is kept in memory only and cleared on refresh.</p>
        </div>

        <div class="action-panel__buttons">
          <Button label="Connect Azure DevOps" @click="openAzureWizard" />
          <Button label="Open JSON" severity="secondary" outlined @click="openImportPicker" />
          <Button
            :loading="indexingFolder"
            :label="folderFileCount > 0 ? `Project Folder (${folderFileCount})` : 'Connect Project Folder'"
            severity="secondary"
            :disabled="dataSourceMode === 'azure'"
            @click="connectFolder"
          />
        </div>
      </section>

      <AzureImportDialog v-model:visible="azureDialogVisible" />

      <section class="status-strip">
        <article v-for="card in statusCards" :key="card.label" class="status-card" :data-type="card.type">
          <h3>{{ card.label }}</h3>
          <p>{{ card.value }}</p>
        </article>
      </section>

      <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
      <Message v-for="warning in importWarnings" :key="warning" severity="warn">{{ warning }}</Message>

      <section v-if="isImporting && dataSourceMode !== 'azure'" class="import-progress">
        <p>Importing alerts... {{ importProgress }} / {{ importTotal }}</p>
        <ProgressBar :value="importTotal ? (importProgress / importTotal) * 100 : 0" />
      </section>

      <FilterPanel />
      <section class="alert-table__head">
        <div>
          <h2>Alert Explorer</h2>
          <p>Browse, filter, and inspect security findings across repositories.</p>
        </div>
        <Button label="Export to JSON" @click="exportJson" />
      </section>
      <AlertTable :alerts="filteredAlerts" @open="store.openAlertDetails" />
    </main>

    <AlertDetailDialog />
  </div>
</template>
