<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Moon, ShieldAlert, Sun } from '@lucide/vue'
import { useUiStore } from '../stores/uiStore'
import githubInvertocatBlack from '../assets/GitHub_Invertocat_Black.svg'
import githubInvertocatWhite from '../assets/GitHub_Invertocat_White.svg'

const uiStore = useUiStore()
const isScrolled = ref(false)
let scrollTimeout: ReturnType<typeof setTimeout> | null = null

const githubMark = computed((): string =>
  uiStore.isDark ? githubInvertocatWhite : githubInvertocatBlack,
)

const repositoryUrl = computed((): string => {
  const configuredUrl = import.meta.env.VITE_GITHUB_REPO_URL?.trim()
  if (configuredUrl) return configuredUrl

  return 'https://github.com/SaegusaMayumi1234/GHAS-Viewer'
})

const syncScrollState = (): void => {
  const threshold = window.scrollY > 24
  const shouldBeScrolled = threshold
  if (isScrolled.value !== shouldBeScrolled) {
    if (scrollTimeout) clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      isScrolled.value = shouldBeScrolled
      scrollTimeout = null
    }, 60)
  }
}

onMounted(() => {
  syncScrollState()
  window.addEventListener('scroll', syncScrollState, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', syncScrollState)
  if (scrollTimeout) clearTimeout(scrollTimeout)
})
</script>

<template>
  <header class="top-nav" :class="{ 'is-scrolled': isScrolled }">
    <div class="top-nav__brand">
      <div class="top-nav__glyph" aria-hidden="true">
        <ShieldAlert class="nav-icon" />
      </div>
      <div class="top-nav__title-wrap">
        <p class="top-nav__kicker">GitHub Advanced Security</p>
        <h1>GHAS Viewer</h1>
      </div>
    </div>

    <div class="top-nav__right">
      <span class="top-nav__mode-label">{{ uiStore.isDark ? 'Dark mode' : 'Light mode' }}</span>
      <button
        type="button"
        class="theme-icon-btn"
        aria-label="Toggle light and dark mode"
        @click="uiStore.toggleTheme"
      >
        <Sun v-if="uiStore.isDark" class="nav-icon" />
        <Moon v-else class="nav-icon" />
      </button>
      <a
        :href="repositoryUrl"
        class="github-link-btn"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open project repository on GitHub"
      >
        <img :src="githubMark" class="nav-icon" alt="" aria-hidden="true" />
        <span>GitHub</span>
      </a>
    </div>
  </header>
</template>
