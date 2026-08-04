<script setup lang="ts">
import type { SourceSnippet } from '../services/sourceReader'

defineProps<{
  snippet: SourceSnippet
}>()

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

    <pre class="code-preview__content"><code><div v-for="(line, idx) in snippet.lines" :key="idx" :class="{ 'is-focus': snippet.startLine + idx === snippet.focusLine }"><span class="line-number">{{ snippet.startLine + idx }}</span><span class="line-text" v-if="snippet.startLine + idx !== snippet.focusLine">{{ line }}</span><span class="line-text" v-else><span>{{ splitFocusLine(line, snippet.focusColumnStart, snippet.focusColumnEnd).before }}</span><span class="column-highlight">{{ splitFocusLine(line, snippet.focusColumnStart, snippet.focusColumnEnd).highlight }}</span><span>{{ splitFocusLine(line, snippet.focusColumnStart, snippet.focusColumnEnd).after }}</span></span></div></code></pre>
  </div>
</template>

<style>
.code-preview {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: color-mix(in srgb, var(--bg-solid), transparent 2%);
}

.code-preview__header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-sm);
  border-bottom: 1px solid var(--border);
  color: var(--text-soft);
  font-size: 0.8rem;
}

.code-preview__content {
  margin: 0;
  padding: var(--space-sm);
  max-height: 320px;
  overflow: auto;
  font-family: var(--font-mono);
  font-size: 0.82rem;
}

.code-preview__content .line-number {
  display: inline-block;
  width: 4.2rem;
  user-select: none;
  color: var(--text-soft);
}

.code-preview__content .line-text {
  white-space: pre;
}

.code-preview__content .is-focus {
  background: color-mix(in srgb, var(--accent), transparent 84%);
}

.code-preview__content .column-highlight {
  background: color-mix(in srgb, var(--accent), transparent 56%);
  color: #ffffff;
  border-radius: 2px;
}
</style>
