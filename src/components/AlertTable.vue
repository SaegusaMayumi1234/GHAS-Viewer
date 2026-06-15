<script setup lang="ts">
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'
import type { NormalizedGhasAlert } from '../types/ghas'

defineProps<{
  alerts: NormalizedGhasAlert[]
}>()

const emit = defineEmits<{
  open: [alertKey: string]
}>()

const severityTone = (severity: string): 'danger' | 'warn' | 'success' | 'contrast' | 'secondary' | undefined => {
  if (severity === 'critical' || severity === 'high') return 'danger'
  if (severity === 'medium') return 'warn'
  if (severity === 'low') return 'success'
  return 'secondary'
}
</script>

<template>
  <DataTable
    :value="alerts"
    data-key="rowKey"
    row-hover
    paginator
    :rows="50"
    :rows-per-page-options="[25, 50, 100, 250]"
    size="small"
    class="alert-table"
  >
    <Column field="id" header="ID" sortable style="min-width: 5rem" />
    <Column header="Details" style="min-width: 6rem">
      <template #body="slotProps">
        <button type="button" class="as-link" @click="emit('open', slotProps.data.rowKey)">View</button>
      </template>
    </Column>
    <Column field="severity" header="Severity" sortable style="min-width: 8rem">
      <template #body="slotProps">
        <Tag :severity="severityTone(slotProps.data.severity)">{{ slotProps.data.severity }}</Tag>
      </template>
    </Column>
    <Column field="state" header="State" sortable style="min-width: 8rem" />
    <Column field="repositoryName" header="Repository" sortable style="min-width: 14rem" />
    <Column field="title" header="Title" style="min-width: 26rem" />
    <Column header="Path" style="min-width: 24rem">
      <template #body="slotProps">
        {{ slotProps.data.locations[0]?.filePath || '-' }}
      </template>
    </Column>
    <Column header="Tool" style="min-width: 10rem">
      <template #body="slotProps">
        {{ slotProps.data.toolNames.join(', ') || '-' }}
      </template>
    </Column>
  </DataTable>
</template>
