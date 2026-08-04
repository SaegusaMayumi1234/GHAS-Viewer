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

<style>
.alert-table {
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: color-mix(in srgb, var(--bg-solid), transparent 0%);
  box-shadow: var(--shadow-sm), var(--shadow-rim);
}

.alert-table__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.alert-table__head h2 {
  margin: 0;
  font-size: 0.98rem;
}

.alert-table__head p {
  margin: 3px 0 0;
  color: var(--text-soft);
  font-size: 0.8rem;
}

.p-datatable-table-container {
  backdrop-filter: blur(0);
}

.p-datatable-thead > tr > th {
  background: color-mix(in srgb, var(--bg-solid), var(--accent) 6%);
  color: var(--text-soft);
  border-color: var(--border);
  font-size: 0.76rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.p-datatable-tbody > tr {
  background: color-mix(in srgb, var(--bg-solid), transparent 0%);
  transition: background var(--duration-fast) var(--ease-standard);
}

.p-datatable-tbody > tr > td,
.p-datatable-thead > tr > th,
.p-paginator {
  border-color: var(--border);
}

.p-datatable-tbody > tr:hover {
  background: color-mix(in srgb, var(--accent), transparent 92%);
}

.as-link {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  text-align: left;
  color: var(--accent-2);
  cursor: pointer;
  font-weight: 600;
}

.as-link:hover {
  text-decoration: underline;
}

@media (max-width: 740px) {
  .alert-table__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .alert-table__head .p-button {
    width: 100%;
  }
}
</style>
