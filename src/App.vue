<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  NAlert,
  NButton,
  NCard,
  NConfigProvider,
  NGi,
  NGlobalStyle,
  NGrid,
  NIcon,
  NMessageProvider,
  NNotificationProvider,
  NProgress,
  NStatistic,
  createDiscreteApi,
  darkTheme,
  type GlobalThemeOverrides,
} from 'naive-ui'
import { Cloud, FileCode, Folder, Trash } from '@vicons/tabler'
import TopNav from './components/TopNav.vue'
import FilterPanel from './components/FilterPanel.vue'
import AlertTable from './components/AlertTable.vue'
import AlertDetailDialog from './components/AlertDetailDialog.vue'
import AzureImportDialog from './components/AzureImportDialog.vue'
import { useGhasStore } from './stores/ghasStore'
import { useUiStore } from './stores/uiStore'

const uiStore = useUiStore()
const { isDark } = storeToRefs(uiStore)

const themeOverrides: GlobalThemeOverrides = {
  common: {
    fontFamily: 'Lato, sans-serif',
    fontFamilyMono: '"Fira Code", monospace',
  },
}

const { message } = createDiscreteApi(['message'], {
  configProviderProps: computed(() => ({
    theme: isDark.value ? darkTheme : null,
    themeOverrides,
  })),
})

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

const connectFolder = async (): Promise<void> => {
  try {
    await store.connectFolder()
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unable to connect project folder.'
    message.error(reason, { duration: 8000 })
  }
}

const severityColors: Record<string, string> = {
  loaded: '#9061f9',
  filtered: '#3b82f6',
  autofixable: '#10b981',
  repos: '#06b6d4',
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
}

const statusCards = computed(() => {
  const alerts = filteredAlerts.value
  return [
    { label: 'Loaded', value: stats.value.totalImported, color: severityColors.loaded },
    { label: 'Filtered', value: stats.value.totalFiltered, color: severityColors.filtered },
    { label: 'Auto-Fixable', value: alerts.filter(a => a.isAutoFixable).length, color: severityColors.autofixable },
    { label: 'Repos', value: new Set(alerts.map(a => a.repositoryName)).size, color: severityColors.repos },
    { label: 'Critical', value: alerts.filter(a => a.severity === 'critical').length, color: severityColors.critical },
    { label: 'High', value: alerts.filter(a => a.severity === 'high').length, color: severityColors.high },
    { label: 'Medium', value: alerts.filter(a => a.severity === 'medium').length, color: severityColors.medium },
    { label: 'Low', value: alerts.filter(a => a.severity === 'low').length, color: severityColors.low },
  ]
})

const importPercent = computed(() =>
  importTotal.value ? Math.round((importProgress.value / importTotal.value) * 100) : 0,
)

const exportJson = (): void => {
  if (filteredAlerts.value.length === 0) {
    message.warning('No alerts are currently shown in the table.')
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
  <NConfigProvider :theme="isDark ? darkTheme : null" :theme-overrides="themeOverrides">
    <NGlobalStyle />
    <NMessageProvider>
      <NNotificationProvider>
        <div class="app-shell">
          <TopNav />

          <input
            ref="fileInputRef"
            type="file"
            accept="application/json"
            class="visually-hidden"
            @change="onImportFile"
          />

          <main class="content">
            <!-- Load Alerts -->
            <NCard title="Load Alerts">
              <template #header-extra>
                <span class="section-sub">Connect to a data source or open an exported file to start exploring your GitHub Advanced Security findings.</span>
              </template>
              <div class="action-grid">
                <!-- Azure DevOps -->
                <NCard size="small" embedded>
                  <NIcon size="24" color="#2080f0" style="margin-bottom: 8px"><Cloud /></NIcon>
                  <h3 class="action-card__name">Import from Azure DevOps</h3>
                  <p class="action-card__desc">Connect using your organization, personal access token, project, and repository to load alerts live.</p>
                  <p class="action-card__note">Token is kept in memory only and cleared on page refresh.</p>
                  <NButton type="primary" block style="margin-top: 12px" @click="azureDialogVisible = true">Connect</NButton>
                </NCard>

                <!-- JSON File -->
                <NCard size="small" embedded>
                  <NIcon size="24" color="#2080f0" style="margin-bottom: 8px"><FileCode /></NIcon>
                  <h3 class="action-card__name">Import from JSON File</h3>
                  <p class="action-card__desc">Open a GHAS alerts JSON export saved on your local disk.</p>
                  <NButton block style="margin-top: 12px" @click="openImportPicker">Open File</NButton>
                </NCard>

                <!-- Link Folder -->
                <NCard size="small" embedded :class="{ 'action-card--muted': dataSourceMode === 'azure' }">
                  <NIcon size="24" :color="folderFileCount > 0 ? '#18a058' : '#2080f0'" style="margin-bottom: 8px"><Folder /></NIcon>
                  <h3 class="action-card__name">Link Source Folder</h3>
                  <p class="action-card__desc">Point to the local repository to enable inline source code preview next to each alert.</p>
                  <p v-if="dataSourceMode === 'azure'" class="action-card__note">Not available in Azure DevOps mode — source is fetched via API.</p>
                  <p v-else-if="folderFileCount > 0" class="action-card__note action-card__note--ok">{{ folderFileCount }} files indexed</p>
                  <p v-else class="action-card__note">Only applies to JSON file imports.</p>
                  <NButton
                    block
                    style="margin-top: 12px"
                    :loading="indexingFolder"
                    :disabled="dataSourceMode === 'azure'"
                    @click="connectFolder"
                  >{{ folderFileCount > 0 ? 'Change Folder' : 'Link Folder' }}</NButton>
                </NCard>

                <!-- Clear Alerts -->
                <NCard v-if="stats.totalImported > 0" size="small" embedded>
                  <NIcon size="24" color="#d03050" style="margin-bottom: 8px"><Trash /></NIcon>
                  <h3 class="action-card__name">Clear All Alerts</h3>
                  <p class="action-card__desc">Remove all {{ stats.totalImported }} loaded alerts and reset all filters and state.</p>
                  <NButton type="error" block style="margin-top: 12px" @click="store.clearAlerts()">Clear All</NButton>
                </NCard>
              </div>
            </NCard>

            <AzureImportDialog v-model:visible="azureDialogVisible" />

            <!-- Status strip -->
            <NGrid :cols="8" x-gap="12" y-gap="12" responsive="screen" :item-responsive="true">
              <NGi
                v-for="card in statusCards"
                :key="card.label"
                span="8 500:4 800:2 1200:1"
              >
                <NCard
                  size="small"
                  class="status-card"
                  :style="{ borderTop: `3px solid ${card.color}` }"
                >
                  <NStatistic :label="card.label" :value="card.value" />
                </NCard>
              </NGi>
            </NGrid>

            <!-- Errors / warnings -->
            <NAlert v-if="errorMessage" type="error" :title="errorMessage" />
            <NAlert
              v-for="warning in importWarnings"
              :key="warning"
              type="warning"
              :title="warning"
            />

            <!-- File import progress -->
            <NCard v-if="isImporting && dataSourceMode !== 'azure'" size="small">
              <p class="import-status">Importing alerts… {{ importProgress }} / {{ importTotal }}</p>
              <NProgress type="line" :percentage="importPercent" processing />
            </NCard>

            <FilterPanel />

            <div class="alert-explorer-head">
              <div>
                <h2>Alert Explorer</h2>
                <p>Browse, filter, and inspect security findings across repositories.</p>
              </div>
              <NButton type="primary" @click="exportJson">Export to JSON</NButton>
            </div>

            <AlertTable :alerts="filteredAlerts" @open="store.openAlertDetails" />
          </main>
        </div>

        <AlertDetailDialog />
      </NNotificationProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style>
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.app-shell {
  min-height: 100vh;
}

.content {
  display: grid;
  gap: 16px;
  padding: 16px 24px 40px;
  max-width: 1800px;
  margin: 0 auto;
}

.section-sub {
  font-size: 0.82rem;
  opacity: 0.6;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 12px;
}

.action-card--muted {
  opacity: 0.45;
  pointer-events: none;
}

.action-card__name {
  margin: 0 0 6px;
  font-size: 0.88rem;
  font-weight: 700;
}

.action-card__desc {
  margin: 0;
  font-size: 0.78rem;
  opacity: 0.65;
  line-height: 1.5;
}

.action-card__note {
  margin: 6px 0 0;
  font-size: 0.73rem;
  opacity: 0.55;
  font-style: italic;
}

.action-card__note--ok {
  color: #18a058;
  opacity: 1;
  font-style: normal;
  font-weight: 600;
}

.status-card {
  height: 100%;
}

.import-status {
  margin: 0 0 10px;
  font-size: 0.88rem;
  opacity: 0.65;
}

.alert-explorer-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.alert-explorer-head h2 {
  margin: 0;
  font-size: 1rem;
}

.alert-explorer-head p {
  margin: 3px 0 0;
  font-size: 0.8rem;
  opacity: 0.6;
}

@media (max-width: 740px) {
  .content {
    padding: 12px;
  }

  .alert-explorer-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
