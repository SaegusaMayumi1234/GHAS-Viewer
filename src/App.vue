<script setup lang="ts">
import { computed, watchEffect } from 'vue'
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

// Toggle a `.dark` class on <body> so plain-CSS tokens in style.css track
// the same light/dark state as the Naive UI theme.
watchEffect(() => {
  document.body.classList.toggle('dark', isDark.value)
})

const lightOverrides: GlobalThemeOverrides = {
  common: {
    fontFamily: 'Lato, sans-serif',
    fontFamilyMono: '"Fira Code", monospace',
    primaryColor: '#2f6fed',
    primaryColorHover: '#1d5fe0',
    primaryColorPressed: '#1650c2',
    primaryColorSuppl: '#2f6fed',
    successColor: '#15803d',
    successColorHover: '#166534',
    warningColor: '#b45309',
    warningColorHover: '#92400e',
    errorColor: '#dc2626',
    errorColorHover: '#b91c1c',
    bodyColor: '#eef1f6',
    cardColor: '#ffffff',
    borderColor: 'rgba(15, 23, 42, 0.12)',
    dividerColor: 'rgba(15, 23, 42, 0.09)',
  },
}

const darkOverrides: GlobalThemeOverrides = {
  common: {
    fontFamily: 'Lato, sans-serif',
    fontFamilyMono: '"Fira Code", monospace',
    primaryColor: '#5b9dff',
    primaryColorHover: '#7bb0ff',
    primaryColorPressed: '#4a89e6',
    primaryColorSuppl: '#5b9dff',
    successColor: '#4ade80',
    successColorHover: '#6ee7a0',
    warningColor: '#fbbf24',
    warningColorHover: '#fcd34d',
    errorColor: '#f87171',
    errorColorHover: '#fca5a5',
    bodyColor: '#14181f',
    cardColor: '#1c212b',
    borderColor: 'rgba(255, 255, 255, 0.11)',
    dividerColor: 'rgba(255, 255, 255, 0.08)',
  },
}

const themeOverrides = computed(() => (isDark.value ? darkOverrides : lightOverrides))

const { message } = createDiscreteApi(['message'], {
  configProviderProps: computed(() => ({
    theme: isDark.value ? darkTheme : null,
    themeOverrides: themeOverrides.value,
  })),
})

const store = useGhasStore()
const { filteredAlerts, stats } = storeToRefs(store)

const severityColors: Record<string, string> = {
  loaded: 'var(--status-loaded)',
  filtered: 'var(--status-filtered)',
  autofixable: 'var(--status-autofixable)',
  repos: 'var(--status-repos)',
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
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.status-card:hover {
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.1);
  transform: translateY(-1px);
}

.dark .status-card {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.dark .status-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
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
  padding-top: var(--app-space-1);
  border-top: 1px solid var(--app-border-soft);
}

.alert-explorer-head h2 {
  margin: 0;
  font-size: var(--app-font-md);
}

.alert-explorer-head p {
  margin: 3px 0 0;
  font-size: var(--app-font-sm);
  opacity: 0.68;
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
