<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  NButton,
  NCard,
  NConfigProvider,
  NGi,
  NGlobalStyle,
  NGrid,
  NMessageProvider,
  NNotificationProvider,
  NStatistic,
  createDiscreteApi,
  darkTheme,
  type GlobalThemeOverrides,
} from 'naive-ui'
import TopNav from './components/TopNav.vue'
import FilterPanel from './components/FilterPanel.vue'
import AlertTable from './components/AlertTable.vue'
import AlertDetailDialog from './components/AlertDetailDialog.vue'
import LoadAlertsPanel from './components/LoadAlertsPanel.vue'
import { useGhasStore } from './stores/ghasStore'
import { useUiStore } from './stores/uiStore'
import { severityColors as severityColorMap } from './utils/severityUtils'

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
const { filteredAlerts, stats } = storeToRefs(store)

const severityColors: Record<string, string> = {
  loaded: '#9061f9',
  filtered: '#3b82f6',
  autofixable: '#10b981',
  repos: '#06b6d4',
  ...severityColorMap,
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

          <main class="content">
            <LoadAlertsPanel />

            <!-- Status strip -->
            <NGrid cols="8" x-gap="12" y-gap="12" responsive="screen" :item-responsive="true">
              <NGi
                v-for="card in statusCards"
                :key="card.label"
                span="xs:8 s:4 m:2 l:1"
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
.app-shell {
  min-height: 100vh;
  width: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
}

.content {
  display: grid;
  gap: var(--app-space-2);
  width: 100%;
  padding: var(--app-space-2) var(--app-space-3) var(--app-space-4);
  max-width: none;
}

.status-card {
  height: 100%;
}

.status-card .n-statistic-value {
  font-size: var(--app-font-lg);
}

.status-card .n-statistic-value__content {
  font-size: var(--app-font-lg);
}

.status-card .n-statistic-label {
  font-size: var(--app-font-xs);
}

.alert-explorer-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--app-space-2);
}

.alert-explorer-head h2 {
  margin: 0;
  font-size: var(--app-font-md);
}

.alert-explorer-head p {
  margin: 3px 0 0;
  font-size: var(--app-font-sm);
  opacity: 0.6;
}

@media (max-width: 740px) {
  .alert-explorer-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .alert-explorer-head .n-button {
    width: 100%;
  }
}
</style>
