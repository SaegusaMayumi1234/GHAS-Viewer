<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMediaQuery } from '@vueuse/core'
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NDivider,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NProgress,
  NSelect,
  NStep,
  NSteps,
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
  azureCurrentStep: currentStep,
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
const isMobile = useMediaQuery('(max-width: 740px)')
const rememberAzureCredentials = ref(false)
const azureCredentialsStorageKey = 'ghas-viewer.azure-credentials'

onMounted(() => {
  syncAzureInputsFromStore()

  const savedCredentials = localStorage.getItem(azureCredentialsStorageKey)
  if (!savedCredentials) return

  try {
    const credentials = JSON.parse(savedCredentials) as { organization?: unknown; pat?: unknown }
    if (typeof credentials.organization !== 'string' || typeof credentials.pat !== 'string') return
    azureOrgInput.value = credentials.organization
    azurePatInput.value = credentials.pat
    rememberAzureCredentials.value = true
  } catch {
    localStorage.removeItem(azureCredentialsStorageKey)
  }
})

const syncAzureInputsFromStore = (): void => {
  azureOrgInput.value = azureOrg.value
  azurePatInput.value = azurePat.value
}

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

const persistAzureCredentials = (): void => {
  if (!rememberAzureCredentials.value) {
    localStorage.removeItem(azureCredentialsStorageKey)
    return
  }

  if (!hasAzureCredentials.value) return

  localStorage.setItem(azureCredentialsStorageKey, JSON.stringify({
    organization: azureOrgInput.value.trim(),
    pat: azurePatInput.value.trim(),
  }))
}

const onRememberAzureCredentialsChange = (value: boolean): void => {
  rememberAzureCredentials.value = value
  persistAzureCredentials()
}

watch([azureOrgInput, azurePatInput, rememberAzureCredentials], () => {
  persistAzureCredentials()
})

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

const maxAvailableStep = computed(() => {
  if (!hasAzureCredentials.value || projectOptions.value.length === 0) return 1
  if (!hasSelectedProject.value || repoOptions.value.length === 0) return 2
  return 3
})

const goToStep = (step: number): void => {
  if (step <= maxAvailableStep.value) currentStep.value = step
}

const goToRepositoryStep = async (): Promise<void> => {
  await loadAzureRepos()
  if (repoOptions.value.length > 0) goToStep(3)
}

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
  !errorMessage.value,
)

const loadAzureProjects = async (): Promise<void> => {
  store.clearAzureFeedback()
  persistAzureCredentials()
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

const onProjectChange = (projectId: string): void => {
  store.selectAzureProject(projectId)
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
  persistAzureCredentials()
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
  <div>
    <p class="action-card__desc">Connect once, then choose project, repositories, and a branch/ref for each repository.</p>

    <NCard>
      <NSteps :current="currentStep" :vertical="isMobile" size="small" class="azure-steps">
        <NStep title="Connect Organization" :description="azureProjectsStatus" />
        <NStep title="Choose Project" :description="azureReposStatus" />
        <NStep title="Choose Repositories and Set Branch/Ref" :description="hasValidAzureRepoRefs ? 'Ready' : 'Not loaded'" />
      </NSteps>

      <NForm label-placement="top" class="azure-inline-form">
        <div class="azure-step-card">
          <div v-if="currentStep === 1" class="azure-step-panel">
            <NAlert v-if="azureConnectionError" type="error" :title="azureConnectionError" :bordered="false" class="azure-action-alert" />
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
            <NCheckbox
              :checked="rememberAzureCredentials"
              class="remember-credentials-checkbox"
              @update:checked="onRememberAzureCredentialsChange"
            >Remember organization and PAT on this device</NCheckbox>
            <div class="azure-inline-actions">
              <NButton
                type="primary"
                :loading="azureLoadingProjects"
                :disabled="!hasAzureCredentials"
                @click="async () => { await loadAzureProjects(); if (projectOptions.length > 0) goToStep(2) }"
              >Next</NButton>
            </div>
            <p v-if="showCredentialRefreshHint" class="action-card__note">Credentials changed. Refresh projects before choosing one.</p>
          </div>

          <div v-else-if="currentStep === 2" class="azure-step-panel">
            <NAlert v-if="azureConnectionError" type="error" :title="azureConnectionError" :bordered="false" class="azure-action-alert" />
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

            <div class="azure-inline-actions">
              <NButton @click="goToStep(1)">Back</NButton>
              <NButton
                type="primary"
                :disabled="!selectedAzureProjectId"
                :loading="azureLoadingRepos"
                @click="goToRepositoryStep"
              >Next</NButton>
            </div>
          </div>

          <div v-else class="azure-step-panel">
            <NAlert v-if="azureConnectionError" type="error" :title="azureConnectionError" :bordered="false" class="azure-action-alert" />
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

            <NDivider />

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
              <NButton @click="goToStep(2)">Back</NButton>
              <NButton
                type="primary"
                :loading="azureLoadingAlerts"
                :disabled="!canImportFromAzure"
                @click="loadAzureAlerts"
              >Import Alerts</NButton>
            </div>
          </div>
        </div>
      </NForm>
    </NCard>
  </div>

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
.action-card__desc {
  margin-top: 10px;
  margin-bottom: 10px;
}

.azure-step-panel {
  margin-top: 0;
}

.azure-action-alert {
  margin-bottom: var(--app-space-2);
}

.remember-credentials-checkbox {
  margin-bottom: 5px;
}

.azure-step-card :deep(.n-divider:not(.n-divider--vertical)) {
  margin-top: 5px;
  margin-bottom: 10px;
}

.azure-inline-form {
  margin-top: var(--app-space-2);
  display: grid;
  gap: var(--app-space-2);
}

.step-state {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--app-border);
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

.azure-step-actions {
  display: flex;
  justify-content: space-between;
  gap: var(--app-space-1);
  margin-top: var(--app-space-2);
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
  .azure-inline-grid {
    grid-template-columns: 1fr;
  }

  .azure-inline-actions :deep(.n-button) {
    width: 100%;
  }
}
</style>
