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
