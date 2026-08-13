<script setup lang="ts">
import { computed } from 'vue'
import { NScrollbar } from 'naive-ui'
import { useThemeVars } from 'naive-ui'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const props = defineProps<{
  markdown: string
}>()

const themeVars = useThemeVars()

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
})

const safeHtml = computed(() => {
  const rendered = md.render(props.markdown || '')
  return DOMPurify.sanitize(rendered)
})

const borderColor = computed(() => themeVars.value.borderColor)
const codeColor = computed(() => themeVars.value.codeColor)
const bodyColor = computed(() => themeVars.value.bodyColor)
</script>

<template>
  <NScrollbar style="max-height: 360px">
    <div class="markdown-body" v-html="safeHtml" />
  </NScrollbar>
</template>

<style scoped>
.markdown-body {
  border: 1px solid v-bind(borderColor);
  border-radius: 6px;
  padding: 10px 12px;
  min-width: 0;
  background: v-bind(bodyColor);
}

.markdown-body :deep(table) {
  display: block;
  overflow-x: auto;
  width: max-content;
  max-width: 100%;
}

.markdown-body :deep(pre) {
  overflow-x: auto;
  min-width: 0;
  padding: 8px 12px;
  border-radius: 4px;
  background: v-bind(codeColor);
}

.markdown-body :deep(pre code) {
  display: block;
  width: max-content;
  min-width: 100%;
  font-family: 'Fira Code', monospace;
}
</style>
