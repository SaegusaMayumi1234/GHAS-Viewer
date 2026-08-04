<script setup lang="ts">
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import { useGhasStore } from '../stores/ghasStore'

const store = useGhasStore()
const { filters, severityOptions, stateOptions, repositoryOptions, toolOptions, globalSearch } = storeToRefs(store)

const toSelectOptions = (values: string[]) => [
  { label: 'All', value: '' },
  ...values.map((value) => ({ label: value, value })),
]
</script>

<template>
  <section class="filter-panel">
    <header class="filter-panel__head">
      <div>
        <h2>Filters</h2>
        <p>Refine alerts by severity, state, repository, tool, and query fields.</p>
      </div>
    </header>

    <div class="filter-panel__grid">
      <div class="filter-row filter-row--search">
        <div class="field field--full">
          <label>Search Any Field</label>
          <InputText
            v-model="globalSearch"
            placeholder="Search title, rule, CWE, file path, commit hash, repository, help text..."
          />
        </div>
      </div>

      <div class="filter-row filter-row--dropdowns">
        <div class="field">
          <label>Severity</label>
          <MultiSelect
            v-model="filters.severities"
            :options="severityOptions"
            placeholder="All severities"
            class="w-full"
          />
        </div>

        <div class="field">
          <label>State</label>
          <MultiSelect v-model="filters.states" :options="stateOptions" placeholder="All states" class="w-full" />
        </div>

        <div class="field">
          <label>Repository</label>
          <Select
            v-model="filters.repositoryName"
            :options="toSelectOptions(repositoryOptions)"
            option-label="label"
            option-value="value"
            placeholder="All"
          />
        </div>

        <div class="field">
          <label>Tool</label>
          <Select
            v-model="filters.toolName"
            :options="toSelectOptions(toolOptions)"
            option-label="label"
            option-value="value"
            placeholder="All"
          />
        </div>
      </div>

      <div class="filter-row filter-row--text-inputs">
        <div class="field">
          <label>Alert ID</label>
          <InputText v-model="filters.alertIdQuery" placeholder="contains id..." />
        </div>

        <div class="field">
          <label>Rule</label>
          <InputText v-model="filters.ruleQuery" placeholder="rule id or name..." />
        </div>

        <div class="field">
          <label>Path</label>
          <InputText v-model="filters.pathQuery" placeholder="file path contains..." />
        </div>
      </div>

      <div class="filter-row filter-row--checkboxes">
        <div class="field field--checkbox">
          <div class="check-row-inline">
            <Checkbox v-model="filters.onlyAutofixable" binary input-id="onlyAuto" />
            <label for="onlyAuto">Only auto-fixable</label>
          </div>
        </div>
        <div class="field field--checkbox">
          <div class="check-row-inline">
            <Checkbox v-model="filters.hideDuplicateAlerts" binary input-id="hideDuplicateAlerts" />
            <label for="hideDuplicateAlerts">Hide duplicate alerts</label>
          </div>
        </div>
      </div>

      <div class="filter-row filter-row--actions">
        <Button label="Reset all filters" severity="secondary" outlined @click="store.resetFilters" />
      </div>
    </div>
  </section>
</template>

<style>
.filter-panel {
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  background: var(--surface-panel);
  box-shadow: var(--shadow-sm), var(--shadow-rim);
  padding: var(--space-md);
}

.filter-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.filter-panel__head h2 {
  margin: 0;
  font-size: 0.95rem;
}

.filter-panel__head p {
  margin: 2px 0 0;
  color: var(--text-soft);
  font-size: 0.78rem;
}

.filter-panel__grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.filter-row {
  display: grid;
  gap: var(--space-sm);
  align-items: end;
}

.filter-row--search {
  grid-template-columns: 1fr;
}

.filter-row--dropdowns,
.filter-row--text-inputs {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.filter-row--actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.filter-row--checkboxes {
  grid-template-columns: 1fr;
}

.check-row-inline {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
  min-height: 1.8rem;
}

.check-row-inline label {
  white-space: nowrap;
}

@media (max-width: 1120px) {
  .filter-row--dropdowns,
  .filter-row--text-inputs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 740px) {
  .filter-row--dropdowns,
  .filter-row--text-inputs {
    grid-template-columns: 1fr;
  }

  .filter-panel__head,
  .filter-row--actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
