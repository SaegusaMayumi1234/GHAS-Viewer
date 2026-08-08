<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NIcon, useThemeVars } from 'naive-ui'
import { ShieldCheck, Sun, Moon } from '@vicons/tabler'
import { useUiStore } from '../stores/uiStore'
import githubInvertocatBlack from '../assets/GitHub_Invertocat_Black.svg'
import githubInvertocatWhite from '../assets/GitHub_Invertocat_White.svg'

const uiStore = useUiStore()
const themeVars = useThemeVars()

const borderColor = computed(() => themeVars.value.borderColor)
const cardColor = computed(() => themeVars.value.cardColor)

const githubMark = computed((): string =>
  uiStore.isDark ? githubInvertocatWhite : githubInvertocatBlack,
)

const repositoryUrl = computed((): string => {
  const configuredUrl = import.meta.env.VITE_GITHUB_REPO_URL?.trim()
  if (configuredUrl) return configuredUrl
  return 'https://github.com/SaegusaMayumi1234/GHAS-Viewer'
})
</script>

<template>
  <header class="top-nav">
    <div class="top-nav__brand">
      <div class="top-nav__glyph" aria-hidden="true">
        <NIcon size="18" color="#2080f0"><ShieldCheck /></NIcon>
      </div>
      <div class="top-nav__title-wrap">
        <p class="top-nav__kicker">GitHub Advanced Security</p>
        <h1>GHAS Viewer</h1>
      </div>
    </div>

    <div class="top-nav__right">
      <span class="top-nav__mode-label">{{ uiStore.isDark ? 'Dark mode' : 'Light mode' }}</span>
      <NButton
        quaternary
        circle
        aria-label="Toggle light and dark mode"
        @click="uiStore.toggleTheme"
      >
        <template #icon>
          <NIcon><Sun v-if="uiStore.isDark" /><Moon v-else /></NIcon>
        </template>
      </NButton>
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

<style scoped>
.top-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 8px 24px;
  border-bottom: 1px solid v-bind(borderColor);
  background: v-bind(cardColor);
}

.top-nav__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.top-nav__glyph {
  display: grid;
  place-items: center;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 8px;
  border: 1px solid rgba(32, 128, 240, 0.3);
  background: rgba(32, 128, 240, 0.08);
  flex-shrink: 0;
}

.top-nav__title-wrap {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.top-nav__kicker {
  margin: 0;
  opacity: 0.5;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.62rem;
  font-weight: 700;
}

.top-nav__title-wrap h1 {
  margin: 0;
  font-size: clamp(1rem, 1.2vw, 1.12rem);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-nav__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.top-nav__mode-label {
  opacity: 0.55;
  font-size: 0.78rem;
  font-weight: 600;
}

.github-link-btn {
  border: 1px solid v-bind(borderColor);
  height: 34px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 6px;
  color: inherit;
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 650;
  background: transparent;
  transition: background 0.15s;
}

.github-link-btn:hover {
  background: rgba(128, 128, 128, 0.1);
}

.nav-icon {
  width: 1.1rem;
  height: 1.1rem;
}

@media (max-width: 740px) {
  .top-nav {
    padding: 8px 12px;
  }

  .top-nav__mode-label {
    display: none;
  }
}
</style>
