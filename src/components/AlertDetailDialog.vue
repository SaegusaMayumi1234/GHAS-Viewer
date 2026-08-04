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
const logicalLocations = computed(() => store.selectedAlert?.logicalLocations ?? [])

const formatLocationKind = (kind: string | undefined): string => {
  if (!kind) return 'Location'
  return kind
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

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

      <section v-if="logicalLocations.length">
        <h3>Dependency Path</h3>
        <div class="dep-chain">
          <template v-for="(loc, i) in logicalLocations" :key="loc.fullyQualifiedName ?? i">
            <div class="dep-chain__connector" v-if="i > 0">
              <span class="dep-chain__line" />
              <span class="dep-chain__arrow">↓</span>
              <span class="dep-chain__line" />
            </div>
            <div class="dep-chain__node" :class="`dep-chain__node--${loc.kind ?? 'default'}`">
              <span class="dep-chain__kind">{{ formatLocationKind(loc.kind) }}</span>
              <span class="dep-chain__name">{{ loc.fullyQualifiedName || '-' }}</span>
            </div>
          </template>
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

<style scoped>
.dep-chain {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  margin-bottom: var(--space-md);
}

.dep-chain__node {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg-panel), var(--accent) 4%);
  min-width: 240px;
  max-width: 100%;
}

.dep-chain__node--rootDependency {
  border-color: color-mix(in srgb, var(--accent), transparent 40%);
  background: color-mix(in srgb, var(--bg-panel), var(--accent) 8%);
}

.dep-chain__kind {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.dep-chain__node--rootDependency .dep-chain__kind {
  color: var(--accent);
}

.dep-chain__name {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--text);
  word-break: break-all;
}

.dep-chain__connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 0 var(--space-md);
  color: var(--text-muted);
  font-size: 0.8rem;
}

.dep-chain__line {
  display: block;
  width: 1px;
  height: 10px;
  background: var(--border-strong);
}

.dep-chain__arrow {
  line-height: 1;
}
</style>
