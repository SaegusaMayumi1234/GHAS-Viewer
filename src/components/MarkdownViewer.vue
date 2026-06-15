<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const props = defineProps<{
  markdown: string
}>()

const md = new MarkdownIt({
  html: false,
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
