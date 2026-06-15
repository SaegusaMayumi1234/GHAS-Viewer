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
