<script setup lang="ts">
import { h, reactive } from 'vue'
import { NButton, NDataTable, NTag, type DataTableColumns } from 'naive-ui'
import type { NormalizedGhasAlert } from '../types/ghas'

const props = defineProps<{
  alerts: NormalizedGhasAlert[]
}>()

const emit = defineEmits<{
  open: [alertKey: string]
}>()

const severityType = (severity: string): 'error' | 'warning' | 'success' | 'default' => {
  if (severity === 'critical' || severity === 'high') return 'error'
  if (severity === 'medium') return 'warning'
  if (severity === 'low') return 'success'
  return 'default'
}

const columns: DataTableColumns<NormalizedGhasAlert> = [
  { title: 'ID', key: 'id', sorter: 'default', width: 72 },
  {
    title: 'Details',
    key: 'actions',
    width: 72,
    render: (row) =>
      h(NButton, { text: true, type: 'primary', size: 'small', onClick: () => emit('open', row.rowKey) }, { default: () => 'View' }),
  },
  {
    title: 'Severity',
    key: 'severity',
    sorter: 'default',
    width: 100,
    render: (row) =>
      h(NTag, { type: severityType(row.severity), size: 'small' }, { default: () => row.severity }),
  },
  { title: 'State', key: 'state', sorter: 'default', width: 96 },
  { title: 'Repository', key: 'repositoryName', sorter: 'default', minWidth: 150 },
  { title: 'Title', key: 'title', minWidth: 210 },
  {
    title: 'Path',
    key: 'path',
    minWidth: 190,
    render: (row) => row.locations[0]?.filePath || '-',
  },
  {
    title: 'Tool',
    key: 'tool',
    minWidth: 120,
    render: (row) => row.toolNames.join(', ') || '-',
  },
]

const pagination = reactive({
  page: 1,
  pageSize: 50,
  pageSizes: [25, 50, 100, 250],
  showSizePicker: true,
  prefix: ({ itemCount }: { itemCount: number | undefined }) => `${itemCount ?? 0} alerts`,
  onUpdatePage(page: number) {
    pagination.page = page
  },
  onUpdatePageSize(pageSize: number) {
    pagination.pageSize = pageSize
    pagination.page = 1
  },
})
</script>

<template>
  <div class="table-wrap">
    <NDataTable
      :columns="columns"
      :data="props.alerts"
      :row-key="(row) => row.rowKey"
      :pagination="pagination"
      size="small"
      :scroll-x="980"
      striped
    />
  </div>
</template>

<style scoped>
.table-wrap {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 740px) {
  .table-wrap :deep(.n-data-table-th),
  .table-wrap :deep(.n-data-table-td) {
    font-size: var(--app-font-xs);
  }
}
</style>
