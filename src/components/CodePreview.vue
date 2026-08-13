<script setup lang="ts">
import { computed } from 'vue'
import { useThemeVars } from 'naive-ui'
import type { SourceSnippet } from '../services/sourceReader'

defineProps<{
  snippet: SourceSnippet
}>()

const themeVars = useThemeVars()

const borderColor = computed(() => themeVars.value.borderColor)
const codeColor = computed(() => themeVars.value.codeColor)
const textColor3 = computed(() => themeVars.value.textColor3)
const primaryColor = computed(() => themeVars.value.primaryColor)
const primaryColorOpaque = computed(() => `${themeVars.value.primaryColor}22`)
const primaryColorHighlight = computed(() => `${themeVars.value.primaryColor}66`)

const splitFocusLine = (
  lineText: string,
  columnStart: number,
  columnEnd: number,
): { before: string; highlight: string; after: string } => {
  const startIndex = Math.max(columnStart - 1, 0)
  const endIndex = Math.max(columnEnd, columnStart)
  const before = lineText.slice(0, startIndex)
  const highlight = lineText.slice(startIndex, endIndex) || lineText.slice(startIndex, startIndex + 1)
  const after = lineText.slice(endIndex)
  return { before, highlight, after }
}
</script>

<template>
  <div class="code-preview">
    <div class="code-preview__header">
      <span>{{ snippet.resolvedPath }}</span>
      <span>Line {{ snippet.focusLine }}</span>
    </div>
    <pre class="code-preview__content"><code><div
  v-for="(line, idx) in snippet.lines"
  :key="idx"
  :class="{ 'is-focus': snippet.startLine + idx === snippet.focusLine }"
><span class="line-number">{{ snippet.startLine + idx }}</span><span
  class="line-text"
  v-if="snippet.startLine + idx !== snippet.focusLine"
>{{ line }}</span><span class="line-text" v-else><span>{{ splitFocusLine(line, snippet.focusColumnStart, snippet.focusColumnEnd).before }}</span><span class="column-highlight">{{ splitFocusLine(line, snippet.focusColumnStart, snippet.focusColumnEnd).highlight }}</span><span>{{ splitFocusLine(line, snippet.focusColumnStart, snippet.focusColumnEnd).after }}</span></span></div></code></pre>
  </div>
</template>

<style scoped>
.code-preview {
  border: 1px solid v-bind(borderColor);
  border-radius: 6px;
  overflow: hidden;
  background: v-bind(codeColor);
}

.code-preview__header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid v-bind(borderColor);
  color: v-bind(textColor3);
  font-size: 0.8rem;
}

.code-preview__content {
  margin: 0;
  padding: 8px;
  max-height: 320px;
  overflow: auto;
  font-family: 'Fira Code', monospace;
  font-size: 0.82rem;
}

.code-preview__content > code {
  display: block;
  width: max-content;
  min-width: 100%;
}

.code-preview__content .line-number {
  display: inline-block;
  width: 4.2rem;
  user-select: none;
  color: v-bind(textColor3);
}

.code-preview__content .line-text {
  white-space: pre;
}

.code-preview__content .is-focus {
  background: v-bind(primaryColorOpaque);
}

.code-preview__content .column-highlight {
  background: v-bind(primaryColorHighlight);
  color: v-bind(primaryColor);
  border-radius: 2px;
}
</style>
