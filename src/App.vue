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

const themeOverrides = computed<GlobalThemeOverrides>(() => ({
  common: {
    fontFamily: 'Lato, sans-serif',
    fontFamilyMono: '"Fira Code", monospace',
    bodyColor: isDark.value ? '#071525' : '#edf3f8',
    cardColor: isDark.value ? '#0d1b2c' : '#ffffff',
    modalColor: isDark.value ? '#102238' : '#ffffff',
    popoverColor: isDark.value ? '#12243a' : '#ffffff',
    tableColor: isDark.value ? '#0d1b2c' : '#ffffff',
    inputColor: isDark.value ? '#0a192a' : '#ffffff',
    codeColor: isDark.value ? '#081421' : '#f1f5f8',
    borderColor: isDark.value ? '#29415c' : '#c9d6e2',
    dividerColor: isDark.value ? '#1d344d' : '#dbe5ed',
    textColorBase: isDark.value ? '#edf5ff' : '#1b2a3a',
    textColor1: isDark.value ? '#edf5ff' : '#1b2a3a',
    textColor2: isDark.value ? '#c6d5e5' : '#34495e',
    textColor3: isDark.value ? '#aabbd0' : '#526579',
    primaryColor: isDark.value ? '#69b7ff' : '#1769c2',
    primaryColorHover: isDark.value ? '#8bc9ff' : '#0f57a8',
    primaryColorPressed: isDark.value ? '#4b9de8' : '#0b478b',
    infoColor: isDark.value ? '#69b7ff' : '#1769c2',
    successColor: isDark.value ? '#4ed391' : '#16804d',
    warningColor: isDark.value ? '#f4c95d' : '#a66a00',
    errorColor: isDark.value ? '#ff7087' : '#c43d55',
  },
  Input: {
    color: isDark.value ? '#102238' : '#ffffff',
    colorFocus: isDark.value ? '#152b43' : '#ffffff',
    colorDisabled: isDark.value ? '#0a1624' : '#f1f5f8',
    textColor: isDark.value ? '#edf5ff' : '#1b2a3a',
    textColorDisabled: isDark.value ? '#657990' : '#8493a3',
    placeholderColor: isDark.value ? '#9fb1c5' : '#6a7c8f',
    placeholderColorDisabled: isDark.value ? '#4c6075' : '#a1afbc',
    border: isDark.value ? '1px solid #3b5877' : '1px solid #b8c8d7',
    borderHover: isDark.value ? '1px solid #6d9dcc' : '1px solid #1769c2',
    borderFocus: isDark.value ? '1px solid #69b7ff' : '1px solid #1769c2',
    boxShadowFocus: isDark.value ? '0 0 0 2px rgba(105, 183, 255, 0.2)' : '0 0 0 2px rgba(23, 105, 194, 0.14)',
    iconColor: isDark.value ? '#9fb1c5' : '#526579',
    iconColorHover: isDark.value ? '#d8e8f8' : '#1b2a3a',
  },
  Select: {
    peers: {
      InternalSelection: {
        color: isDark.value ? '#102238' : '#ffffff',
        colorActive: isDark.value ? '#152b43' : '#ffffff',
        colorDisabled: isDark.value ? '#0a1624' : '#f1f5f8',
        textColor: isDark.value ? '#edf5ff' : '#1b2a3a',
        textColorDisabled: isDark.value ? '#657990' : '#8493a3',
        placeholderColor: isDark.value ? '#9fb1c5' : '#6a7c8f',
        placeholderColorDisabled: isDark.value ? '#4c6075' : '#a1afbc',
        border: isDark.value ? '1px solid #3b5877' : '1px solid #b8c8d7',
        borderHover: isDark.value ? '1px solid #6d9dcc' : '1px solid #1769c2',
        borderActive: isDark.value ? '1px solid #69b7ff' : '1px solid #1769c2',
        borderFocus: isDark.value ? '1px solid #69b7ff' : '1px solid #1769c2',
        boxShadowFocus: isDark.value ? '0 0 0 2px rgba(105, 183, 255, 0.2)' : '0 0 0 2px rgba(23, 105, 194, 0.14)',
        boxShadowActive: isDark.value ? '0 0 0 2px rgba(105, 183, 255, 0.2)' : '0 0 0 2px rgba(23, 105, 194, 0.14)',
      },
    },
  },
  Button: {
    textColorPrimary: isDark.value ? '#071525' : '#ffffff',
    textColorHoverPrimary: isDark.value ? '#071525' : '#ffffff',
    textColorPressedPrimary: isDark.value ? '#071525' : '#ffffff',
    textColorFocusPrimary: isDark.value ? '#071525' : '#ffffff',
  },
}))

const { message } = createDiscreteApi(['message'], {
  configProviderProps: computed(() => ({
    theme: isDark.value ? darkTheme : null,
    themeOverrides: themeOverrides.value,
  })),
})

const store = useGhasStore()
const { filteredAlerts, stats } = storeToRefs(store)

const severityColors: Record<string, string> = {
  loaded: 'var(--app-color-loaded)',
  filtered: 'var(--app-color-filtered)',
  autofixable: 'var(--app-color-autofixable)',
  repos: 'var(--app-color-repos)',
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
        <div class="app-shell" :class="isDark ? 'app-theme--dark' : 'app-theme--light'">
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
  color: var(--n-text-color-1);
  background: linear-gradient(145deg, var(--app-page-background) 0%, var(--app-page-background-end) 100%);
  background-attachment: fixed;
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
