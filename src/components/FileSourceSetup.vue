<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { NAlert, NButton, NCard, NIcon, NProgress, useMessage } from 'naive-ui'
import { FileCode, Folder } from '@vicons/tabler'
import { useGhasStore } from '../stores/ghasStore'
import { calcPercent } from '../utils/snippetUtils'

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

const importPercent = computed(() => calcPercent(importProgress.value, importTotal.value))
</script>

<template>
  <input
    ref="fileInputRef"
    type="file"
    accept="application/json"
    class="visually-hidden"
    @change="onImportFile"
  />

  <div>
    <p class="action-card__desc">Import alerts JSON file and link your project folder to preview source code.</p>

    <div class="action-card__content">
      <NCard class="guided-step" size="small">
        <NIcon class="guided-step__icon" size="28" color="var(--app-color-azure)"><FileCode /></NIcon>
        <div class="guided-step__head">

          <div>
            <h4>Select JSON File</h4>
            <p>Load your GitHub Advanced Security alerts export to start exploring findings.</p>
          </div>
        </div>
        <div class="file-actions">
          <NButton type="primary" block @click="openImportPicker">Import Alerts JSON</NButton>
        </div>
      </NCard>

      <NCard class="guided-step" size="small">
        <NIcon class="guided-step__icon" size="28" color="var(--app-color-azure)"><Folder /></NIcon>
        <div class="guided-step__head">

          <div>
            <h4>Link Project Folder</h4>
            <p>Connect your local project folder to preview matching source files beside alert.</p>
          </div>
        </div>
        <div class="file-actions">
          <NButton block :loading="indexingFolder" @click="connectFolder">
            {{ folderFileCount > 0 ? 'Change Linked Folder' : 'Link Project Folder' }}
          </NButton>
        </div>
        <p v-if="folderFileCount > 0" class="action-card__note action-card__note--ok">{{ folderFileCount }} files indexed</p>
      </NCard>
    </div>
  </div>

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
.action-card__desc {
  margin-top: 10px;
  margin-bottom: 10px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.action-card__content {
  display: grid;
  gap: var(--app-space-2);
  grid-template-columns: repeat(2, 1fr);
}

.action-card__note--ok {
  color: var(--app-color-azure);
  opacity: 1;
  font-style: normal;
  font-weight: 600;
}

.guided-step__head {
  display: flex;
  align-items: flex-start;
  gap: var(--app-space-2);
}

.guided-step__icon {
  flex: 0 0 auto;
  margin-top: 2px;
}

.guided-step h4 {
  margin: 0;
}

.guided-step p {
  margin: 6px 0 0;
  font-size: var(--app-font-sm);
  line-height: 1.5;  display: grid;
  opacity: 0.7;
}

.file-actions {
  gap: var(--app-space-1);
  margin-top: var(--app-space-2);
}

.import-status {
  margin: 0 0 10px;
  font-size: var(--app-font-sm);
  opacity: 0.65;
}

@media (max-width: 740px) {
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
