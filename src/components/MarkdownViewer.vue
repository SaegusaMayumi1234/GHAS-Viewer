<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const props = defineProps<{
  markdown: string
}>()

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
})

const safeHtml = computed(() => {
  const rendered = md.render(props.markdown || '')
  return DOMPurify.sanitize(rendered)
})
</script>

<template>
  <div class="markdown-body" v-html="safeHtml" />
</template>

<style>
.markdown-body {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-sm);
  max-height: 360px;
  min-width: 0;
  overflow: auto;
  overflow-x: auto;
  background: color-mix(in srgb, var(--bg-solid), transparent 2%);
}

.markdown-body table {
  display: block;
  overflow-x: auto;
  width: max-content;
  max-width: 100%;
}

.markdown-body pre {
  overflow-x: auto;
  min-width: 0;
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-solid), #000 10%);
}

.markdown-body pre code {
  display: block;
  width: max-content;
  min-width: 100%;
}
</style>
