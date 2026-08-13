<script setup lang="ts">
import { computed } from 'vue'
import { NAlert, NDescriptions, NDescriptionsItem, NModal, NSpin, NTag, NText } from 'naive-ui'
import CodePreview from './CodePreview.vue'
import MarkdownViewer from './MarkdownViewer.vue'
import { useGhasStore } from '../stores/ghasStore'
import { formatDateHumanly } from '../utils/dateFormatter'
import { severityType } from '../utils/severityUtils'

const store = useGhasStore()

const visible = computed({
  get: () => store.selectedAlertId != null,
  set: (value) => { if (!value) store.closeAlertDetails() },
})

const firstHelpMessage = computed(() => store.selectedAlert?.helpMessages[0] || '')
const firstResources = computed(() => store.selectedAlert?.resources[0] || '')
const ruleDescriptions = computed(() => store.selectedAlert?.ruleDescriptions || [])
const primaryLocation = computed(() => store.selectedAlert?.locations[0] ?? null)
const logicalLocations = computed(() => store.selectedAlert?.logicalLocations ?? [])


const formatLocationKind = (kind: string | undefined): string => {
  if (!kind) return 'Location'
  return kind.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim()
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
  <NModal
    v-model:show="visible"
    preset="card"
    title="Alert Details"
    :style="{ width: 'min(96vw, 1120px)' }"
    :segmented="{ content: 'soft', footer: 'soft' }"
    display-directive="show"
    class="alert-detail-modal"
  >
    <template v-if="store.selectedAlert">
      <div class="detail-head">
        <div class="detail-head__text">
          <h2>{{ store.selectedAlert.title }}</h2>
          <p>ID: {{ store.selectedAlert.id }} &middot; {{ store.selectedAlert.repositoryName }}</p>
        </div>
        <div class="tag-stack">
          <NTag :type="severityType(store.selectedAlert.severity)" size="small">{{ store.selectedAlert.severity }}</NTag>
          <NTag size="small">{{ store.selectedAlert.state }}</NTag>
          <NTag v-if="store.selectedAlert.isAutoFixable" type="success" size="small">Auto-fixable</NTag>
        </div>
      </div>

      <NDescriptions :column="2" bordered label-placement="top" size="small" style="margin-bottom: 16px">
        <NDescriptionsItem label="Rule IDs">{{ store.selectedAlert.ruleIds.join(', ') || '-' }}</NDescriptionsItem>
        <NDescriptionsItem label="Tools">{{ store.selectedAlert.toolNames.join(', ') || '-' }}</NDescriptionsItem>
        <NDescriptionsItem label="Path">{{ primaryLocation?.filePath || '-' }}</NDescriptionsItem>
        <NDescriptionsItem label="Location">{{ locationText }}</NDescriptionsItem>
        <NDescriptionsItem label="First Seen">{{ formatDateLabel(store.selectedAlert.firstSeenDate) }}</NDescriptionsItem>
        <NDescriptionsItem label="Last Seen">{{ formatDateLabel(store.selectedAlert.lastSeenDate) }}</NDescriptionsItem>
      </NDescriptions>

      <template v-if="ruleDescriptions.length">
        <h3 class="section-title">Description</h3>
        <div class="detail-list">
          <MarkdownViewer v-for="(desc, i) in ruleDescriptions" :key="i" :markdown="desc" />
        </div>
      </template>

      <div class="detail-grid">
        <div>
          <h3 class="section-title">Help Message</h3>
          <MarkdownViewer :markdown="firstHelpMessage" />
        </div>
        <div>
          <h3 class="section-title">Resources</h3>
          <MarkdownViewer :markdown="firstResources" />
        </div>
      </div>

      <template v-if="logicalLocations.length">
        <h3 class="section-title">Dependency Path</h3>
        <div class="dep-chain">
          <template v-for="(loc, i) in logicalLocations" :key="loc.fullyQualifiedName ?? i">
            <div v-if="i > 0" class="dep-chain__connector">
              <span class="dep-chain__line" />
              <span class="dep-chain__arrow">↓</span>
              <span class="dep-chain__line" />
            </div>
            <div class="dep-chain__node" :class="`dep-chain__node--${loc.kind ?? 'default'}`">
              <NText class="dep-chain__kind" depth="3" style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em">
                {{ formatLocationKind(loc.kind) }}
              </NText>
              <code class="dep-chain__name">{{ loc.fullyQualifiedName || '-' }}</code>
            </div>
          </template>
        </div>
      </template>

      <h3 class="section-title">Source Preview</h3>
      <NAlert v-if="!hasSourcePreview" type="info" title="This alert does not have a source location." :bordered="false" />
      <NAlert v-else-if="(store as any).sourceError" type="warning" :title="(store as any).sourceError" :bordered="false" />
      <div v-else-if="store.sourceLoading" style="display: flex; align-items: center; gap: 8px; padding: 12px 0">
        <NSpin size="small" />
        <span style="font-size: 0.875rem; opacity: 0.7">Loading source preview…</span>
      </div>
      <CodePreview v-else-if="store.sourceSnippet" :snippet="store.sourceSnippet" />
      <NAlert v-else type="default" title="No source preview available." :bordered="false" />
    </template>
  </NModal>
</template>

<style scoped>
.detail-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.detail-head h2 {
  margin: 0;
  font-size: 1.15rem;
  line-height: 1.2;
}

.detail-head p {
  margin: 4px 0 0;
  opacity: 0.6;
  font-size: 0.85rem;
}

.tag-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: flex-start;
}

.section-title {
  margin: 16px 0 8px;
  font-size: 0.9rem;
  font-weight: 700;
}

.detail-list {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.detail-grid > div {
  min-width: 0;
}

.dep-chain {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 16px;
}

.dep-chain__node {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid var(--n-border-color);
  min-width: 240px;
  max-width: 100%;
}

.dep-chain__node--rootDependency {
  border-color: var(--app-color-azure);
  background: var(--app-color-azure-soft);
}

.dep-chain__name {
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  word-break: break-all;
}

.dep-chain__connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 14px;
  opacity: 0.4;
  font-size: 0.8rem;
}

.dep-chain__line {
  display: block;
  width: 1px;
  height: 10px;
  background: currentColor;
}

@media (max-width: 1120px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .detail-head {
    flex-direction: column;
  }
}
</style>
