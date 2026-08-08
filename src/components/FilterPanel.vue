<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { NButton, NCheckbox, NInput, NSelect } from 'naive-ui'
import { useGhasStore } from '../stores/ghasStore'

const store = useGhasStore()
const { filters, severityOptions, stateOptions, repositoryOptions, toolOptions, globalSearch } = storeToRefs(store)

const toOptions = (values: string[]) => [
  { label: 'All', value: '' },
  ...values.map((v) => ({ label: v, value: v })),
]

const toMultiOptions = (values: string[]) => values.map((v) => ({ label: v, value: v }))
</script>

<template>
  <div class="filter-panel">
    <div class="filter-panel__head">
      <div>
        <h2>Filters</h2>
        <p>Refine alerts by severity, state, repository, tool, and query fields.</p>
      </div>
    </div>

    <div class="filter-grid">
      <div class="field field--full">
        <label>Search Any Field</label>
        <NInput
          v-model:value="globalSearch"
          placeholder="Search title, rule, CWE, file path, commit hash, repository, help text..."
          clearable
        />
      </div>

      <div class="field">
        <label>Severity</label>
        <NSelect
          v-model:value="filters.severities"
          :options="toMultiOptions(severityOptions)"
          multiple
          clearable
          placeholder="All severities"
        />
      </div>

      <div class="field">
        <label>State</label>
        <NSelect
          v-model:value="filters.states"
          :options="toMultiOptions(stateOptions)"
          multiple
          clearable
          placeholder="All states"
        />
      </div>

      <div class="field">
        <label>Repository</label>
        <NSelect
          v-model:value="filters.repositoryName"
          :options="toOptions(repositoryOptions)"
          placeholder="All"
        />
      </div>

      <div class="field">
        <label>Tool</label>
        <NSelect
          v-model:value="filters.toolName"
          :options="toOptions(toolOptions)"
          placeholder="All"
        />
      </div>

      <div class="field">
        <label>Alert ID</label>
        <NInput v-model:value="filters.alertIdQuery" placeholder="contains id..." clearable />
      </div>

      <div class="field">
        <label>Rule</label>
        <NInput v-model:value="filters.ruleQuery" placeholder="rule id or name..." clearable />
      </div>

      <div class="field">
        <label>Path</label>
        <NInput v-model:value="filters.pathQuery" placeholder="file path contains..." clearable />
      </div>

      <div class="field field--checkboxes">
        <NCheckbox v-model:checked="filters.onlyAutofixable">Only auto-fixable</NCheckbox>
        <NCheckbox v-model:checked="filters.hideDuplicateAlerts">Hide duplicate alerts</NCheckbox>
      </div>

      <div class="field field--actions">
        <NButton @click="store.resetFilters">Reset all filters</NButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-panel__head h2 {
  margin: 0;
  font-size: 0.95rem;
}

.filter-panel__head p {
  margin: 2px 0 0;
  opacity: 0.6;
  font-size: 0.78rem;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  align-items: end;
}

.field {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.field--full {
  grid-column: 1 / -1;
}

.field--checkboxes {
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: flex-end;
}

.field--actions {
  display: flex;
  justify-content: flex-end;
  grid-column: 1 / -1;
}

.field > label {
  font-size: 0.78rem;
  opacity: 0.6;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

@media (max-width: 1120px) {
  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 740px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>
