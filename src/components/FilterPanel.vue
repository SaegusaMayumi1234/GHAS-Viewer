<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { NButton, NCheckbox, NInput, NSelect, useThemeVars } from 'naive-ui'
import { useGhasStore } from '../stores/ghasStore'

const store = useGhasStore()
const { filters, severityOptions, stateOptions, repositoryOptions, toolOptions, globalSearch } = storeToRefs(store)

const themeVars = useThemeVars()
const cardColor = computed(() => themeVars.value.cardColor)

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
  gap: var(--app-space-2);
  background: v-bind(cardColor);
  border: 1px solid var(--app-border-soft);
  border-radius: 12px;
  padding: var(--app-space-3);
}

.filter-panel__head h2 {
  margin: 0;
  font-size: var(--app-font-md);
}

.filter-panel__head p {
  margin: 2px 0 0;
  opacity: 0.68;
  font-size: var(--app-font-sm);
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--app-space-2);
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
  gap: var(--app-space-1);
  justify-content: flex-end;
}

.field--actions {
  display: flex;
  justify-content: flex-end;
  grid-column: 1 / -1;
}

.field :deep(.n-select),
.field :deep(.n-input) {
  max-width: 100%;
  overflow: hidden;
}

.field :deep(.n-select .n-base-selection) {
  min-width: 0;
}

.field :deep(.n-base-selection-tags) {
  flex-wrap: wrap;
}

.field > label {
  font-size: var(--app-font-xs);
  opacity: 0.65;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

@media (max-width: 900px) {
  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }

  .field--actions :deep(.n-button) {
    width: 100%;
  }
}
</style>
