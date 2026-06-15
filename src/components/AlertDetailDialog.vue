<script setup lang="ts">
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import CodePreview from './CodePreview.vue'
import MarkdownViewer from './MarkdownViewer.vue'
import { useGhasStore } from '../stores/ghasStore'
import { formatDateHumanly } from '../utils/dateFormatter'

const store = useGhasStore()

const visible = computed({
  get: () => store.selectedAlertId != null,
  set: (value) => {
    if (!value) store.closeAlertDetails()
  },
})

const firstHelpMessage = computed(() => store.selectedAlert?.helpMessages[0] || '')
const firstResources = computed(() => store.selectedAlert?.resources[0] || '')
const ruleDescriptions = computed(() => store.selectedAlert?.ruleDescriptions || [])
const primaryLocation = computed(() => store.selectedAlert?.locations[0] ?? null)
const hasSourcePreview = computed(
  () => primaryLocation.value?.filePath && primaryLocation.value?.lineStart != null,
)

const locationText = computed(() => {
  if (!primaryLocation.value) return '-'
  const { lineStart, lineEnd, columnStart, columnEnd } = primaryLocation.value
  if (lineStart == null || lineEnd == null || columnStart == null || columnEnd == null) return '-'
  return `${lineStart}:${columnStart} - ${lineEnd}:${columnEnd}`
})

const formatDateLabel = (value: string): string => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return `${formatDateHumanly(value)} (${parsed.toLocaleString()})`
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    maximizable
    header="Alert Details"
    class="alert-detail-dialog"
    :style="{ width: 'min(96vw, 1120px)' }"
    :breakpoints="{ '1024px': '96vw', '640px': '100vw' }"
  >
    <template v-if="store.selectedAlert">
      <div class="detail-head">
        <div>
          <h2>{{ store.selectedAlert.title }}</h2>
          <p>ID: {{ store.selectedAlert.id }} | Repo: {{ store.selectedAlert.repositoryName }}</p>
        </div>
        <div class="tag-stack">
          <Tag>{{ store.selectedAlert.severity }}</Tag>
          <Tag severity="secondary">{{ store.selectedAlert.state }}</Tag>
          <Tag v-if="store.selectedAlert.isAutoFixable" severity="success">Auto-fixable</Tag>
        </div>
      </div>

      <section class="detail-meta">
        <p><strong>Rule IDs:</strong> {{ store.selectedAlert.ruleIds.join(', ') || '-' }}</p>
        <p><strong>Tools:</strong> {{ store.selectedAlert.toolNames.join(', ') || '-' }}</p>
        <p><strong>Path:</strong> {{ primaryLocation?.filePath || '-' }}</p>
        <p><strong>Location:</strong> {{ locationText }}</p>
        <p><strong>First seen:</strong> {{ formatDateLabel(store.selectedAlert.firstSeenDate) }}</p>
        <p><strong>Last seen:</strong> {{ formatDateLabel(store.selectedAlert.lastSeenDate) }}</p>
      </section>

      <section v-if="ruleDescriptions.length">
        <h3>Description</h3>
        <div class="detail-list">
          <article v-for="(description, index) in ruleDescriptions" :key="index" class="detail-list__item">
            <MarkdownViewer :markdown="description" />
          </article>
        </div>
      </section>

      <section class="detail-grid">
        <div>
          <h3>Help Message</h3>
          <MarkdownViewer :markdown="firstHelpMessage" />
        </div>
        <div>
          <h3>Resources</h3>
          <MarkdownViewer :markdown="firstResources" />
        </div>
      </section>

      <section>
        <h3>Source Preview</h3>
        <Message v-if="!hasSourcePreview" severity="info">
          This alert does not have source preview.
        </Message>
        <Message v-else-if="store.sourceError" severity="warn">{{ store.sourceError }}</Message>
        <Message v-else-if="store.sourceLoading" severity="secondary">Loading source preview...</Message>
        <CodePreview v-else-if="store.sourceSnippet" :snippet="store.sourceSnippet" />
        <Message v-else severity="secondary">No source preview available.</Message>
      </section>
    </template>
  </Dialog>
</template>
