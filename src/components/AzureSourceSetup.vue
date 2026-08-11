<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  NAlert,
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NProgress,
  NSelect,
} from 'naive-ui'
import { useGhasStore } from '../stores/ghasStore'
import { calcPercent } from '../utils/snippetUtils'

const store = useGhasStore()
const {
  isImporting,
  importProgress,
  importTotal,
  importWarnings,
  errorMessage,
  dataSourceMode,
  stats,
  azureOrg,
  azurePat,
  azureRepoRefs,
  azureProjects,
  azureRepos,
  selectedAzureProjectId,
  selectedAzureRepoIds,
  azureLoadingProjects,
  azureLoadingRepos,
  azureLoadingAlerts,
  azureConnectionError,
  azureWarnings,
} = storeToRefs(store)

const azureOrgInput = ref('')
const azurePatInput = ref('')
const lastLoadedCredentialKey = ref('')
const progressModalVisible = ref(false)

const syncAzureInputsFromStore = (): void => {
  azureOrgInput.value = azureOrg.value
  azurePatInput.value = azurePat.value
}

onMounted(() => {
  syncAzureInputsFromStore()
})

watch([azureOrg, azurePat], () => {
  syncAzureInputsFromStore()
})

const projectOptions = computed(() =>
  azureProjects.value.map((project) => ({
    label: project.name,
    value: project.id,
  })),
)

const repoOptions = computed(() =>
  azureRepos.value.map((repo) => ({
    label: repo.name,
    value: repo.id,
  })),
)

const hasAzureCredentials = computed(() =>
  Boolean(azureOrgInput.value.trim() && azurePatInput.value.trim()),
)

const azureCredentialKey = computed(() =>
  `${azureOrgInput.value.trim()}::${azurePatInput.value.trim()}`,
)

const hasSelectedProject = computed(() => Boolean(selectedAzureProjectId.value))
const hasSelectedRepo = computed(() => selectedAzureRepoIds.value.length > 0)

const selectedAzureRepoRows = computed(() => {
  const selectedIds = new Set(selectedAzureRepoIds.value)
  const selectedRepos = azureRepos.value.filter((repo) => selectedIds.has(repo.id))
  return selectedAzureRepoIds.value
    .map((repoId) => {
      const repo = selectedRepos.find((item) => item.id === repoId)
      if (!repo) return null
      const configuredRef = (azureRepoRefs.value[repo.id] ?? '').trim()
      const resolvedRef = configuredRef || repo.defaultBranch || ''
      return {
        id: repo.id,
        name: repo.name,
        configuredRef,
        resolvedRef,
      }
    })
    .filter((item): item is { id: string; name: string; configuredRef: string; resolvedRef: string } => item != null)
})

const showCredentialRefreshHint = computed(() =>
  Boolean(lastLoadedCredentialKey.value) &&
  hasAzureCredentials.value &&
  azureCredentialKey.value !== lastLoadedCredentialKey.value,
)

const normalizeRefInput = (value: string): string => value.trim()

const isLikelyValidAzureRef = (value: string): boolean => {
  const normalized = normalizeRefInput(value)
  if (!normalized) return false
  if (/\s/.test(normalized)) return false
  if (normalized.startsWith('refs/')) return true
  return /^[A-Za-z0-9._/-]+$/.test(normalized)
}

const hasValidAzureRepoRefs = computed(() => {
  if (!hasSelectedRepo.value) return false
  return selectedAzureRepoRows.value.every((repo) => isLikelyValidAzureRef(repo.resolvedRef))
})

const canImportFromAzure = computed(() => hasSelectedRepo.value && hasValidAzureRepoRefs.value)

const azureProjectsStatus = computed(() => {
  if (azureLoadingProjects.value) return 'Loading'
  if (projectOptions.value.length > 0) return `Found ${projectOptions.value.length} projects`
  if (showCredentialRefreshHint.value) return 'Credentials updated, refresh projects'
  return 'Not loaded'
})

const azureReposStatus = computed(() => {
  if (azureLoadingRepos.value) return 'Loading'
  if (repoOptions.value.length > 0) return `Found ${repoOptions.value.length} repositories`
  if (hasSelectedProject.value) return 'Not loaded'
  return 'Select project first'
})

const azureProgressPercent = computed(() => calcPercent(importProgress.value, importTotal.value))

const azureHasSuccess = computed(() =>
  dataSourceMode.value === 'azure' &&
  !isImporting.value &&
  !azureConnectionError.value &&
  !errorMessage.value &&
  stats.value.totalImported > 0,
)

const loadAzureProjects = async (): Promise<void> => {
  store.clearAzureFeedback()
  store.setAzureCredentials(azureOrgInput.value, azurePatInput.value)
  store.setDataSourceMode('azure')
  await store.loadAzureProjects()
  if (!azureConnectionError.value && azureProjects.value.length > 0) {
    lastLoadedCredentialKey.value = azureCredentialKey.value
  }
}

const loadAzureRepos = async (): Promise<void> => {
  store.clearAzureFeedback()
  await store.loadAzureRepos()
}

const onProjectChange = async (projectId: string): Promise<void> => {
  store.selectAzureProject(projectId)
  if (!hasAzureCredentials.value) return
  await loadAzureRepos()
}

const onRepoChange = (repoIds: string[]): void => {
  store.selectAzureRepo(repoIds)
}

const onRepoRefChange = (repoId: string, value: string): void => {
  const nextRef = normalizeRefInput(value)
  if (!nextRef) {
    const repo = azureRepos.value.find((item) => item.id === repoId)
    if (repo?.defaultBranch) {
      store.setAzureRepoRef(repoId, repo.defaultBranch)
      return
    }
  }
  store.setAzureRepoRef(repoId, nextRef)
}

const loadAzureAlerts = async (): Promise<void> => {
  const invalidRefRepoNames = selectedAzureRepoRows.value
    .filter((repo) => !isLikelyValidAzureRef(repo.resolvedRef))
    .map((repo) => repo.name)

  if (invalidRefRepoNames.length > 0) {
    azureConnectionError.value = `Enter a valid Branch/Ref for: ${invalidRefRepoNames.join(', ')}`
    return
  }

  store.clearAzureFeedback()
  store.setAzureCredentials(azureOrgInput.value, azurePatInput.value)
  store.setDataSourceMode('azure')
  progressModalVisible.value = true
  await store.fetchAlertsFromAzure()
}

const closeProgressModal = (): void => {
  if (isImporting.value) return
  progressModalVisible.value = false
}
</script>

<template>
  <NCard size="small" embedded>
    <h3 class="action-card__name">Connect Azure DevOps</h3>
    <p class="action-card__desc">Connect once, then choose project, repositories, and a branch/ref for each repository.</p>
    <p class="action-card__note">Your token is kept in memory only and cleared on refresh.</p>

    <NForm label-placement="top" class="azure-inline-form">
      <div class="guided-step">
        <div class="guided-step__head">
          <h4>Connect Organization</h4>
          <span class="step-state">{{ azureProjectsStatus }}</span>
        </div>

        <div class="azure-inline-grid">
          <NFormItem label="Organization">
            <NInput
              :value="azureOrgInput"
              placeholder="your-org"
              @update:value="(value) => (azureOrgInput = value)"
            />
          </NFormItem>
          <NFormItem label="Personal Access Token">
            <NInput
              :value="azurePatInput"
              type="password"
              show-password-on="click"
              placeholder="Azure DevOps PAT"
              @update:value="(value) => (azurePatInput = value)"
            />
          </NFormItem>
        </div>
        <div class="azure-inline-actions">
          <NButton
            type="primary"
            :loading="azureLoadingProjects"
            :disabled="!hasAzureCredentials"
            @click="loadAzureProjects"
          >Get Projects</NButton>
        </div>
        <p v-if="showCredentialRefreshHint" class="action-card__note">Credentials changed. Refresh projects before choosing one.</p>
      </div>

      <div class="guided-step">
        <div class="guided-step__head">
          <h4>Choose Project and Repository</h4>
          <span class="step-state">{{ azureReposStatus }}</span>
        </div>

        <div class="azure-inline-grid">
          <NFormItem label="Project">
            <NSelect
              :value="selectedAzureProjectId"
              :options="projectOptions"
              :disabled="!hasAzureCredentials || azureLoadingProjects || projectOptions.length === 0"
              filterable
              filter-placeholder="Search project..."
              placeholder="Select project"
              @update:value="(value) => onProjectChange(value)"
            />
          </NFormItem>
          <NFormItem label="Repository">
            <NSelect
              :value="selectedAzureRepoIds"
              :options="repoOptions"
              :disabled="!selectedAzureProjectId || azureLoadingRepos || repoOptions.length === 0"
              multiple
              clearable
              max-tag-count="responsive"
              filterable
              filter-placeholder="Search repository..."
              placeholder="Select one or more repositories"
              @update:value="(value) => onRepoChange(value)"
            />
          </NFormItem>
        </div>

        <div class="azure-inline-actions">
          <NButton
            :loading="azureLoadingRepos"
            :disabled="!selectedAzureProjectId"
            @click="loadAzureRepos"
          >Get Repositories</NButton>
        </div>
      </div>

      <div class="guided-step">
        <div class="guided-step__head">
          <h4>Set Branch/Ref Per Repository</h4>
          <span class="step-state">{{ hasValidAzureRepoRefs ? 'Ready' : 'Required' }}</span>
        </div>

        <div v-if="selectedAzureRepoRows.length > 0" class="repo-ref-grid">
          <NFormItem
            v-for="repo in selectedAzureRepoRows"
            :key="repo.id"
            :label="`Branch/Ref · ${repo.name}`"
          >
            <NInput
              :value="repo.configuredRef || repo.resolvedRef"
              placeholder="main or refs/heads/main"
              @update:value="(value) => onRepoRefChange(repo.id, value)"
            />
          </NFormItem>
        </div>
        <p v-else class="action-card__note">Select repositories first to configure branch/ref values.</p>

        <p class="action-card__note">Use branch name like main or full ref like refs/heads/main.</p>
        <div class="azure-inline-actions">
          <NButton
            type="primary"
            :loading="azureLoadingAlerts"
            :disabled="!canImportFromAzure"
            @click="loadAzureAlerts"
          >Import Alerts</NButton>
        </div>
      </div>
    </NForm>
  </NCard>

  <NModal
    v-model:show="progressModalVisible"
    preset="card"
    title="Azure Import Status"
    :mask-closable="!isImporting"
    :closable="!isImporting"
    :style="{ width: 'min(96vw, 680px)' }"
    :segmented="{ content: 'soft', footer: 'soft' }"
  >
    <p class="import-status-text" v-if="isImporting && importTotal > 0">Importing alerts... {{ azureProgressPercent }}%</p>
    <p class="import-status-text" v-else-if="isImporting">Preparing alerts...</p>
    <p class="import-status-text" v-else-if="azureHasSuccess">Import completed successfully.</p>
    <p class="import-status-text" v-else>Import finished with errors.</p>

    <NProgress
      type="line"
      :percentage="importTotal > 0 ? azureProgressPercent : 0"
      :processing="isImporting"
      :status="isImporting ? 'info' : azureHasSuccess ? 'success' : 'error'"
      :show-indicator="importTotal > 0"
    />

    <NAlert
      v-if="azureConnectionError"
      type="error"
      :title="azureConnectionError"
      :bordered="false"
      style="margin-top: 10px"
    />
    <NAlert
      v-if="errorMessage && dataSourceMode === 'azure'"
      type="error"
      :title="errorMessage"
      :bordered="false"
      style="margin-top: 10px"
    />
    <NAlert
      v-if="azureHasSuccess"
      type="success"
      :title="`Loaded ${stats.totalImported} alerts. Filtered view: ${stats.totalFiltered}.`"
      :bordered="false"
      style="margin-top: 10px"
    />

    <div v-if="azureWarnings.length || importWarnings.length" class="warnings-list">
      <NAlert
        v-for="warning in [...azureWarnings, ...importWarnings]"
        :key="warning"
        type="warning"
        :title="warning"
        :bordered="false"
        size="small"
      />
    </div>

    <template #footer>
      <div class="dialog-actions">
        <NButton :disabled="isImporting" @click="closeProgressModal">Close</NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
.azure-inline-form {
  margin-top: var(--app-space-2);
  display: grid;
  gap: var(--app-space-2);
}

.step-state {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(128, 128, 128, 0.34);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: var(--app-font-xs);
  font-weight: 600;
  opacity: 0.8;
}

.azure-inline-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--app-space-2);
}

.azure-inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--app-space-1);
  margin-bottom: var(--app-space-1);
}

.repo-ref-grid {
  display: grid;
  gap: var(--app-space-1);
}

.import-status-text {
  margin: 0 0 10px;
  font-size: var(--app-font-sm);
  opacity: 0.7;
}

.warnings-list {
  display: grid;
  gap: 4px;
  max-height: 160px;
  overflow-y: auto;
  margin-top: 10px;
}

@media (max-width: 740px) {
  .guided-step__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .azure-inline-grid {
    grid-template-columns: 1fr;
  }

  .azure-inline-actions :deep(.n-button) {
    width: 100%;
  }
}
</style>
