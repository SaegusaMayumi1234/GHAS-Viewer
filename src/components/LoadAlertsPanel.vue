<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  NButton,
  NCard,
  NIcon,
  NModal,
  NRadio,
  NRadioGroup,
} from 'naive-ui'
import { Cloud, FileCode, Trash } from '@vicons/tabler'
import AzureSourceSetup from './AzureSourceSetup.vue'
import FileSourceSetup from './FileSourceSetup.vue'
import { useGhasStore } from '../stores/ghasStore'
import type { DataSourceMode } from '../types/ghas'

const store = useGhasStore()
const { stats } = storeToRefs(store)

const sourceSelectionVisible = ref(false)
const sourceChoice = ref<DataSourceMode | null>(null)
const selectedSourceMode = ref<DataSourceMode | null>(null)

const hasSelectedSource = computed(() => selectedSourceMode.value != null)

const openSourceSelector = (): void => {
  sourceChoice.value = selectedSourceMode.value
  sourceSelectionVisible.value = true
}

const applySourceSelection = (): void => {
  if (!sourceChoice.value) return
  store.clearAzureFeedback()
  store.setDataSourceMode(sourceChoice.value)
  selectedSourceMode.value = sourceChoice.value
  sourceSelectionVisible.value = false
}

const cancelSourceSelection = (): void => {
  sourceSelectionVisible.value = false
}
</script>

<template>
  <NCard>
    <div class="load-panel__content">
      <div class="load-panel__head">
        <div>
          <h2>Load Alerts</h2>
          <p>Choose a source, complete setup, then import alerts from one guided flow.</p>
        </div>
        <NButton type="primary" @click="openSourceSelector">{{ hasSelectedSource ? 'Switch Source' : 'Choose Source' }}</NButton>
      </div>

      <div v-if="hasSelectedSource" class="source-flow">
        <AzureSourceSetup v-if="selectedSourceMode === 'azure'" />
        <FileSourceSetup v-else-if="selectedSourceMode === 'file'" />
      </div>

      <NCard v-if="stats.totalImported > 0" size="small" embedded>
        <NIcon size="24" color="var(--color-danger)" style="margin-bottom: 8px"><Trash /></NIcon>
        <h3 class="action-card__name">Reset Imported Alerts</h3>
        <p class="action-card__desc">Remove all {{ stats.totalImported }} imported alerts and reset filters.</p>
        <NButton type="error" block style="margin-top: 12px" @click="store.clearAlerts()">Reset Alerts</NButton>
      </NCard>
    </div>
  </NCard>

  <NModal
    v-model:show="sourceSelectionVisible"
    preset="card"
    title="Choose Alert Source"
    :style="{ width: 'min(96vw, 860px)' }"
    :segmented="{ content: 'soft', footer: 'soft' }"
  >
    <NRadioGroup v-model:value="sourceChoice">
      <div class="source-choice-grid">
        <label class="source-choice-card" :class="{ 'source-choice-card--active': sourceChoice === 'azure' }">
          <div class="source-choice-head">
            <NRadio value="azure" />
            <NIcon size="24" color="var(--color-azure)"><Cloud /></NIcon>
          </div>
          <h3 class="action-card__name">Connect Azure DevOps</h3>
          <p class="action-card__desc">Import alerts from Azure DevOps using organization, project, repositories, and branch/ref settings.</p>
        </label>

        <label class="source-choice-card" :class="{ 'source-choice-card--active': sourceChoice === 'file' }">
          <div class="source-choice-head">
            <NRadio value="file" />
            <NIcon size="24" color="var(--color-azure)"><FileCode /></NIcon>
          </div>
          <h3 class="action-card__name">Import from JSON File</h3>
          <p class="action-card__desc">Import local GHAS JSON and optionally link your project folder for source preview.</p>
        </label>
      </div>
    </NRadioGroup>

    <template #footer>
      <div class="dialog-actions">
        <NButton @click="cancelSourceSelection">Cancel</NButton>
        <NButton type="primary" :disabled="!sourceChoice" @click="applySourceSelection">Continue</NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
.load-panel__content {
  display: grid;
  gap: var(--app-space-2);
}

.load-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--app-space-2);
}

.load-panel__head h2 {
  margin: 0;
  font-size: var(--app-font-md);
}

.load-panel__head p {
  margin: 2px 0 0;
  opacity: 0.68;
  font-size: var(--app-font-sm);
}

.source-flow {
  display: grid;
  gap: var(--app-space-2);
}

.source-choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--app-space-2);
}

.source-choice-card {
  border: 1px solid var(--app-border-soft);
  border-radius: 12px;
  padding: var(--app-space-2);
  display: block;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.source-choice-card:hover {
  border-color: var(--color-azure);
  background: var(--color-azure-subtle);
}

.source-choice-card--active {
  border-color: var(--color-azure);
  background: var(--color-azure-subtle);
  box-shadow: 0 0 0 1px var(--color-azure);
}

.source-choice-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

@media (max-width: 740px) {
  .load-panel__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .load-panel__head :deep(.n-button) {
    width: 100%;
  }

  .source-choice-grid {
    grid-template-columns: 1fr;
  }
}
</style>
