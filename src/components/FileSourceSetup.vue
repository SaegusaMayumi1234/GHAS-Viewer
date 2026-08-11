<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { NAlert, NButton, NCard, NProgress, useMessage } from 'naive-ui'
import { useGhasStore } from '../stores/ghasStore'

const store = useGhasStore()
const {
  isImporting,
  importProgress,
  importTotal,
  importWarnings,
  errorMessage,
  indexingFolder,
  folderFileCount,
} = storeToRefs(store)

const message = useMessage()
const fileInputRef = ref<HTMLInputElement | null>(null)

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

const importPercent = computed(() =>
  importTotal.value ? Math.round((importProgress.value / importTotal.value) * 100) : 0,
)
</script>

<template>
  <input
    ref="fileInputRef"
    type="file"
    accept="application/json"
    class="visually-hidden"
    @change="onImportFile"
  />

  <NCard size="small" embedded>
    <h3 class="action-card__name">Import from File</h3>
    <p class="action-card__desc">Import GHAS JSON. Link a project folder to enable source preview.</p>

    <div class="action-card__content">
      <div class="guided-step">
        <div class="guided-step__head">
          <h4>Select GHAS JSON</h4>
          <span class="step-state">Required</span>
        </div>
        <div class="file-actions">
          <NButton type="primary" block @click="openImportPicker">Import Alerts JSON</NButton>
        </div>
      </div>

      <div class="guided-step">
        <div class="guided-step__head">
          <h4>Link Project Folder</h4>
          <span class="step-state" :class="{ 'step-state--ok': folderFileCount > 0 }">{{ folderFileCount > 0 ? 'Connected' : 'Optional' }}</span>
        </div>
        <div class="file-actions">
          <NButton block :loading="indexingFolder" @click="connectFolder">
            {{ folderFileCount > 0 ? 'Change Linked Folder' : 'Link Project Folder' }}
          </NButton>
        </div>
      </div>
    </div>
    
    <p v-if="folderFileCount > 0" class="action-card__note action-card__note--ok">{{ folderFileCount }} files indexed</p>
    <p v-else class="action-card__note">Linking a folder enables source preview beside each alert.</p>
  </NCard>

  <NAlert v-if="errorMessage" type="error" :title="errorMessage" />
  <NAlert
    v-for="warning in importWarnings"
    :key="warning"
    type="warning"
    :title="warning"
  />

  <NCard v-if="isImporting" size="small">
    <p class="import-status">Importing alerts... {{ importProgress }} / {{ importTotal }}</p>
    <NProgress type="line" :percentage="importPercent" processing />
  </NCard>
</template>

<style scoped>
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.action-card__name {
  margin: 0 0 6px;
  font-size: var(--app-font-md);
  font-weight: 700;
}

.action-card__desc {
  margin: 0;
  font-size: var(--app-font-sm);
  opacity: 0.65;
  line-height: 1.5;
}

.action-card__content {
  display: grid;
  gap: var(--app-space-2);
  margin-top: var(--app-space-2);
  grid-template-columns: repeat(2, 1fr);
}

.action-card__note {
  margin: 6px 0 0;
  font-size: var(--app-font-xs);
  opacity: 0.55;
  font-style: italic;
}

.action-card__note--ok {
  color: #18a058;
  opacity: 1;
  font-style: normal;
  font-weight: 600;
}

.guided-step {
  border: 1px solid rgba(128, 128, 128, 0.22);
  border-radius: 10px;
  padding: var(--app-space-2);
  margin-top: var(--app-space-2);
}

.guided-step__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--app-space-1);
  margin-bottom: var(--app-space-1);
}

.guided-step__head h4 {
  margin: 0;
  font-size: var(--app-font-sm);
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

.step-state--ok {
  color: #18a058;
  border-color: rgba(24, 160, 88, 0.45);
}

.file-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--app-space-1);
  margin-top: var(--app-space-2);
}

.import-status {
  margin: 0 0 10px;
  font-size: var(--app-font-sm);
  opacity: 0.65;
}

@media (max-width: 740px) {
  .guided-step__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .action-card__content {
    display: grid;
    gap: var(--app-space-2);
    margin-top: var(--app-space-2);
    grid-template-columns: 1fr;
  }

  .file-actions {
    grid-template-columns: 1fr;
  }
}
</style>
