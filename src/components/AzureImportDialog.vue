<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { NAlert, NButton, NForm, NFormItem, NInput, NModal, NProgress, NSelect, NStep, NSteps } from 'naive-ui'
import { useGhasStore } from '../stores/ghasStore'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const store = useGhasStore()
const {
  isImporting,
  importProgress,
  importTotal,
  importWarnings,
  errorMessage,
  dataSourceMode,
  azureOrg,
  azurePat,
  azureRef,
  azureProjects,
  azureRepos,
  selectedAzureProjectId,
  selectedAzureRepoId,
  azureLoadingProjects,
  azureLoadingRepos,
  azureLoadingAlerts,
  azureConnectionError,
  azureWarnings,
  stats,
} = storeToRefs(store)

const azureOrgInput = ref('')
const azurePatInput = ref('')
const azureStep = ref(1)
const FINAL_AZURE_STEP = 4

const visible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const projectOptions = computed(() =>
  azureProjects.value.map((p) => ({ label: p.name, value: p.id })),
)

const repoOptions = computed(() =>
  azureRepos.value.map((r) => ({ label: r.name, value: r.id })),
)

const canContinueCredentialStep = computed(() =>
  Boolean(azureOrgInput.value.trim() && azurePatInput.value.trim()),
)

const azureProgressValue = computed(() => {
  if (importTotal.value <= 0) return 0
  return Math.max(0, Math.min(100, (importProgress.value / importTotal.value) * 100))
})

const azureProgressPercent = computed(() => Math.round(azureProgressValue.value))
const isAzureImportStep = computed(() => azureStep.value === FINAL_AZURE_STEP)
const canGoBackFromImportStep = computed(() => isAzureImportStep.value && !isImporting.value)

const syncInputsFromStore = (): void => {
  azureOrgInput.value = azureOrg.value
  azurePatInput.value = azurePat.value
}

const openStepOne = (): void => {
  syncInputsFromStore()
  azureStep.value = 1
  store.clearAzureFeedback()
}

watch(() => props.visible, (nextVisible) => {
  if (nextVisible) openStepOne()
})

const connectAzure = (): void => {
  store.setAzureCredentials(azureOrgInput.value, azurePatInput.value)
  store.setDataSourceMode('azure')
}

const closeDialog = (): void => {
  store.clearAzureFeedback()
  visible.value = false
}

const onDialogHide = (): void => {
  store.clearAzureFeedback()
}

const goBackAzureStep = (): void => {
  store.clearAzureFeedback()
  if (azureStep.value === FINAL_AZURE_STEP) { azureStep.value = 3; return }
  azureStep.value = Math.max(azureStep.value - 1, 1)
}

const continueToProjectStep = async (): Promise<void> => {
  const nextOrg = azureOrgInput.value.trim()
  const nextPat = azurePatInput.value.trim()
  const canReuseProjects = nextOrg === azureOrg.value && nextPat === azurePat.value && azureProjects.value.length > 0
  store.clearAzureFeedback()
  connectAzure()
  if (!canReuseProjects) await store.loadAzureProjects()
  if (!azureConnectionError.value) azureStep.value = 2
}

const continueToRepoStep = async (): Promise<void> => {
  const canReuseRepos = Boolean(selectedAzureProjectId.value) && azureRepos.value.length > 0
  store.clearAzureFeedback()
  if (!canReuseRepos) await store.loadAzureRepos()
  if (!azureConnectionError.value) azureStep.value = 3
}

const onProjectChange = (projectId: string): void => {
  store.selectAzureProject(projectId)
}

const onRepoChange = (repoId: string): void => {
  store.selectAzureRepo(repoId)
}

const onRefChange = (value: string | undefined): void => {
  store.setAzureRef(value ?? '')
}

const fetchAzureAlerts = async (): Promise<void> => {
  store.clearAzureFeedback()
  azureStep.value = FINAL_AZURE_STEP
  await store.fetchAlertsFromAzure()
}
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="card"
    title="Azure DevOps Connection"
    :style="{ width: 'min(96vw, 760px)' }"
    :segmented="{ content: 'soft', footer: 'soft' }"
    display-directive="show"
    @after-leave="onDialogHide"
  >
    <NSteps :current="azureStep" size="small" style="margin-bottom: 20px">
      <NStep title="Org + PAT" />
      <NStep title="Project" />
      <NStep title="Repo + Load" />
      <NStep title="Import" />
    </NSteps>

    <!-- Feedback outside the import step -->
    <template v-if="!isAzureImportStep">
      <NAlert
        v-if="azureConnectionError"
        type="error"
        :title="azureConnectionError"
        :bordered="false"
        style="margin-bottom: 10px"
      />
      <NAlert
        v-if="errorMessage && dataSourceMode === 'azure'"
        type="error"
        :title="errorMessage"
        :bordered="false"
        style="margin-bottom: 10px"
      />
      <div v-if="azureWarnings.length || importWarnings.length" class="warnings-list">
        <NAlert
          v-for="w in [...azureWarnings, ...importWarnings]"
          :key="w"
          type="warning"
          :title="w"
          :bordered="false"
          size="small"
        />
      </div>
    </template>

    <!-- Step 1: Credentials -->
    <NForm v-if="azureStep === 1" label-placement="top">
      <NFormItem label="Organization">
        <NInput v-model:value="azureOrgInput" placeholder="your-org" />
      </NFormItem>
      <NFormItem label="Personal Access Token">
        <NInput v-model:value="azurePatInput" type="password" show-password-on="click" placeholder="Azure DevOps PAT" />
      </NFormItem>
    </NForm>

    <!-- Step 2: Project -->
    <NForm v-else-if="azureStep === 2" label-placement="top">
      <NFormItem label="Project">
        <NSelect
          :value="selectedAzureProjectId"
          :options="projectOptions"
          filterable
          filter-placeholder="Search project…"
          placeholder="Select project"
          @update:value="onProjectChange"
        />
      </NFormItem>
    </NForm>

    <!-- Step 3: Repo + Ref -->
    <NForm v-else-if="azureStep === 3" label-placement="top">
      <NFormItem label="Repository">
        <NSelect
          :value="selectedAzureRepoId"
          :options="repoOptions"
          filterable
          filter-placeholder="Search repository…"
          placeholder="Select repository"
          @update:value="onRepoChange"
        />
      </NFormItem>
      <NFormItem label="Ref">
        <NInput :value="azureRef" placeholder="refs/heads/main" @update:value="onRefChange" />
      </NFormItem>
    </NForm>

    <!-- Step 4: Import progress -->
    <div v-else class="import-progress-body">
      <p class="import-status-text">
        <template v-if="isImporting && importTotal > 0">Importing alerts… {{ azureProgressPercent }}%</template>
        <template v-else-if="isImporting">Preparing alerts…</template>
        <template v-else>Import complete.</template>
      </p>
      <NProgress
        type="line"
        :percentage="azureProgressValue"
        :processing="isImporting"
        :status="isImporting ? 'info' : 'success'"
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
        v-if="dataSourceMode === 'azure' && !isImporting && !azureConnectionError && !errorMessage && stats.totalImported > 0"
        type="success"
        :title="`Loaded ${stats.totalImported} alerts. Filtered view: ${stats.totalFiltered}.`"
        :bordered="false"
        style="margin-top: 10px"
      />
    </div>

    <template #footer>
      <div class="dialog-actions">
        <NButton @click="closeDialog">{{ isAzureImportStep ? 'Close' : 'Cancel' }}</NButton>
        <NButton v-if="azureStep > 1 && azureStep < FINAL_AZURE_STEP" @click="goBackAzureStep">Back</NButton>
        <NButton
          v-if="azureStep === 1"
          type="primary"
          :loading="azureLoadingProjects"
          :disabled="!canContinueCredentialStep"
          @click="continueToProjectStep"
        >Continue</NButton>
        <NButton
          v-else-if="azureStep === 2"
          type="primary"
          :loading="azureLoadingRepos"
          :disabled="!selectedAzureProjectId"
          @click="continueToRepoStep"
        >Continue</NButton>
        <NButton
          v-else-if="azureStep === 3"
          type="primary"
          :loading="azureLoadingAlerts"
          :disabled="!selectedAzureRepoId || !azureRef"
          @click="fetchAzureAlerts"
        >Load Alerts</NButton>
        <NButton
          v-else-if="canGoBackFromImportStep"
          @click="goBackAzureStep"
        >Back</NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
.warnings-list {
  display: grid;
  gap: 4px;
  max-height: 160px;
  overflow-y: auto;
  margin-bottom: 10px;
}

.import-progress-body {
  padding: 4px 0;
}

.import-status-text {
  margin: 0 0 10px;
  font-size: 0.88rem;
  opacity: 0.7;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
