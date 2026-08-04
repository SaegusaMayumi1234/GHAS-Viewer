<script setup lang="ts">
import { computed, ref } from 'vue'
import { Cloud, FileJson, FolderOpen, Trash2 } from '@lucide/vue'
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
      life: 8000,
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
      <section class="action-panel">
        <header class="action-panel__header">
          <h2 class="action-panel__title">Load Alerts</h2>
          <p class="action-panel__subtitle">Connect to a data source or open an exported file to start exploring your GitHub Advanced Security findings.</p>
        </header>

        <div class="action-cards">
          <div class="action-card">
            <Cloud class="action-card__icon" />
            <div class="action-card__body">
              <h3 class="action-card__name">Import from Azure DevOps</h3>
              <p class="action-card__desc">Connect using your organization, personal access token, project, and repository to load alerts live.</p>
              <p class="action-card__note">Token is kept in memory only and cleared on page refresh.</p>
            </div>
            <Button label="Connect" icon-pos="right" fluid @click="openAzureWizard" />
          </div>

          <div class="action-card">
            <FileJson class="action-card__icon" />
            <div class="action-card__body">
              <h3 class="action-card__name">Import from JSON File</h3>
              <p class="action-card__desc">Open a GHAS alerts JSON export saved on your local disk.</p>
            </div>
            <Button label="Open File" severity="secondary" outlined fluid @click="openImportPicker" />
          </div>

          <div class="action-card" :class="{ 'action-card--active': folderFileCount > 0, 'action-card--muted': dataSourceMode === 'azure' }">
            <FolderOpen class="action-card__icon" />
            <div class="action-card__body">
              <h3 class="action-card__name">Link Source Folder</h3>
              <p class="action-card__desc">Point to the local repository that matches your imported JSON file to enable inline source code preview next to each alert.</p>
              <p v-if="dataSourceMode === 'azure'" class="action-card__note">Not available in Azure DevOps mode — source preview is fetched directly via the API.</p>
              <p v-else-if="folderFileCount > 0" class="action-card__note action-card__note--ok">{{ folderFileCount }} files indexed</p>
              <p v-else class="action-card__note">Only applies to JSON file imports.</p>
            </div>
            <Button
              :loading="indexingFolder"
              :label="folderFileCount > 0 ? 'Change Folder' : 'Link Folder'"
              severity="secondary"
              outlined
              :disabled="dataSourceMode === 'azure'"
              fluid
              @click="connectFolder"
            />
          </div>

          <div v-if="stats.totalImported > 0" class="action-card action-card--danger">
            <Trash2 class="action-card__icon" />
            <div class="action-card__body">
              <h3 class="action-card__name">Clear All Alerts</h3>
              <p class="action-card__desc">Remove all {{ stats.totalImported }} loaded alerts and reset all filters and state.</p>
            </div>
            <Button label="Clear All" severity="danger" outlined fluid @click="store.clearAlerts()" />
          </div>
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
