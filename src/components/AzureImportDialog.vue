<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import ProgressBar from 'primevue/progressbar'
import Select from 'primevue/select'
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

const projectOptions = computed(() => azureProjects.value.map((project) => ({
  label: project.name,
  value: project.id,
})))

const repoOptions = computed(() => azureRepos.value.map((repo) => ({
  label: repo.name,
  value: repo.id,
})))

const canContinueCredentialStep = computed(() => Boolean(azureOrgInput.value.trim() && azurePatInput.value.trim()))
const azureProgressValue = computed(() => {
  if (importTotal.value <= 0) {
    return 0
  }

  const percentage = (importProgress.value / importTotal.value) * 100
  return Math.max(0, Math.min(100, percentage))
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

watch(
  () => props.visible,
  (nextVisible) => {
    if (nextVisible) {
      openStepOne()
    }
  },
)

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
  if (azureStep.value === FINAL_AZURE_STEP) {
    azureStep.value = 3
    return
  }

  azureStep.value = Math.max(azureStep.value - 1, 1)
}

const continueToProjectStep = async (): Promise<void> => {
  const nextOrg = azureOrgInput.value.trim()
  const nextPat = azurePatInput.value.trim()
  const canReuseProjects = nextOrg === azureOrg.value && nextPat === azurePat.value && azureProjects.value.length > 0

  store.clearAzureFeedback()
  connectAzure()

  if (!canReuseProjects) {
    await store.loadAzureProjects()
  }

  if (!azureConnectionError.value) {
    azureStep.value = 2
  }
}

const continueToRepoStep = async (): Promise<void> => {
  const canReuseRepos = Boolean(selectedAzureProjectId.value) && azureRepos.value.length > 0

  store.clearAzureFeedback()
  if (!canReuseRepos) {
    await store.loadAzureRepos()
  }

  if (!azureConnectionError.value) {
    azureStep.value = 3
  }
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
  <Dialog
    v-model:visible="visible"
    modal
    header="Azure DevOps Connection"
    class="azure-wizard"
    :style="{ width: 'min(96vw, 760px)' }"
    :breakpoints="{ '1024px': '96vw', '640px': '100vw' }"
    @hide="onDialogHide"
  >
    <div class="azure-wizard__steps" role="list" aria-label="Azure setup steps">
      <span class="azure-step" :class="{ 'is-active': azureStep === 1, 'is-done': azureStep > 1 }">1. Org + PAT</span>
      <span class="azure-step" :class="{ 'is-active': azureStep === 2, 'is-done': azureStep > 2 }">2. Project</span>
      <span class="azure-step" :class="{ 'is-active': azureStep === 3, 'is-done': azureStep > 3 }">3. Repo + Load</span>
      <span class="azure-step" :class="{ 'is-active': isAzureImportStep }">4. Import</span>
    </div>

    <div class="azure-wizard__feedback" v-if="!isAzureImportStep && (azureConnectionError || (errorMessage && dataSourceMode === 'azure'))">
      <Message v-if="azureConnectionError" severity="error" class="azure-feedback__message">{{ azureConnectionError }}</Message>
      <Message v-if="errorMessage && dataSourceMode === 'azure'" severity="error" class="azure-feedback__message">{{ errorMessage }}</Message>
    </div>

    <div v-if="!isAzureImportStep && (azureWarnings.length || importWarnings.length)" class="azure-wizard__warnings">
      <Message v-for="warning in azureWarnings" :key="`azure-modal-${warning}`" severity="warn" class="azure-feedback__message azure-feedback__message--warn">{{ warning }}</Message>
      <Message v-for="warning in importWarnings" :key="`azure-import-${warning}`" severity="warn" class="azure-feedback__message azure-feedback__message--warn">{{ warning }}</Message>
    </div>

    <div v-if="azureStep === 1" class="azure-wizard__body">
      <div class="field">
        <label>Organization</label>
        <InputText v-model="azureOrgInput" placeholder="your-org" />
      </div>
      <div class="field">
        <label>PAT</label>
        <InputText v-model="azurePatInput" type="password" placeholder="Azure DevOps PAT" />
      </div>
    </div>

    <div v-else-if="azureStep === 2" class="azure-wizard__body">
      <div class="field">
        <label>Project</label>
        <Select
          :model-value="selectedAzureProjectId"
          :options="projectOptions"
          option-label="label"
          option-value="value"
          filter
          filter-placeholder="Search project..."
          placeholder="Select project"
          @update:model-value="onProjectChange"
        />
      </div>
    </div>

    <div v-else-if="azureStep === 3" class="azure-wizard__body">
      <div class="field">
        <label>Repository</label>
        <Select
          :model-value="selectedAzureRepoId"
          :options="repoOptions"
          option-label="label"
          option-value="value"
          filter
          filter-placeholder="Search repository..."
          placeholder="Select repository"
          @update:model-value="onRepoChange"
        />
      </div>
      <div class="field">
        <label>Ref</label>
        <InputText :model-value="azureRef" placeholder="refs/heads/main" @update:model-value="onRefChange" />
      </div>
    </div>

    <div v-else class="azure-wizard__body">
      <section class="import-progress import-progress--modal">
        <p>
          <template v-if="isImporting && importTotal > 0">Importing alerts... {{ azureProgressPercent }}%</template>
          <template v-else-if="isImporting">Preparing alerts...</template>
          <template v-else>Import complete.</template>
        </p>
        <ProgressBar v-if="isImporting && importTotal <= 0" mode="indeterminate" />
        <ProgressBar v-else :value="azureProgressValue" />
      </section>

      <Message v-if="azureConnectionError" severity="error" class="azure-feedback__message">{{ azureConnectionError }}</Message>
      <Message v-if="errorMessage && dataSourceMode === 'azure'" severity="error" class="azure-feedback__message">{{ errorMessage }}</Message>
      <Message
        v-if="dataSourceMode === 'azure' && !isImporting && !azureConnectionError && !errorMessage && stats.totalImported > 0"
        severity="success"
        class="azure-feedback__message azure-feedback__message--success"
      >
        Loaded {{ stats.totalImported }} alerts. Filtered view: {{ stats.totalFiltered }}.
      </Message>
    </div>

    <template #footer>
      <div class="azure-wizard__actions">
        <Button :label="isAzureImportStep ? 'Close' : 'Cancel'" severity="secondary" text @click="closeDialog" />
        <Button v-if="azureStep > 1 && azureStep < FINAL_AZURE_STEP" label="Back" severity="secondary" outlined @click="goBackAzureStep" />
        <Button
          v-if="azureStep === 1"
          label="Continue"
          :loading="azureLoadingProjects"
          :disabled="!canContinueCredentialStep"
          @click="continueToProjectStep"
        />
        <Button
          v-else-if="azureStep === 2"
          label="Continue"
          :loading="azureLoadingRepos"
          :disabled="!selectedAzureProjectId"
          @click="continueToRepoStep"
        />
        <Button
          v-else-if="azureStep === 3"
          label="Load Alerts"
          :loading="azureLoadingAlerts"
          :disabled="!selectedAzureRepoId || !azureRef"
          @click="fetchAzureAlerts"
        />
        <Button
          v-else-if="canGoBackFromImportStep"
          label="Back"
          severity="secondary"
          outlined
          @click="goBackAzureStep"
        />
      </div>
    </template>
  </Dialog>
</template>
