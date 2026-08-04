<script setup lang="ts">
import { computed } from 'vue'
import { Moon, ShieldAlert, Sun } from '@lucide/vue'
import { useUiStore } from '../stores/uiStore'
import githubInvertocatBlack from '../assets/GitHub_Invertocat_Black.svg'
import githubInvertocatWhite from '../assets/GitHub_Invertocat_White.svg'

const uiStore = useUiStore()

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

<style>
.top-nav {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-lg);
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg-panel), transparent 18%);
  backdrop-filter: blur(var(--blur-sm));
  transition:
    background var(--duration-normal) var(--ease-standard),
    border-color var(--duration-normal) var(--ease-standard),
    backdrop-filter var(--duration-normal) var(--ease-standard),
    box-shadow var(--duration-normal) var(--ease-standard),
    transform var(--duration-normal) var(--ease-standard);
}

.top-nav__brand {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.top-nav__glyph {
  display: grid;
  place-items: center;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--accent), var(--border) 62%);
  background: color-mix(in srgb, var(--accent), transparent 88%);
  color: var(--accent);
  box-shadow: var(--shadow-rim);
}

.top-nav__title-wrap {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.top-nav__kicker {
  margin: 0;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.62rem;
  font-weight: 700;
}

.top-nav__title-wrap h1 {
  margin: 0;
  font-size: clamp(1rem, 1.2vw, 1.12rem);
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-nav__right {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.github-link-btn {
  border: 1px solid var(--border);
  min-height: 2.2rem;
  padding: 0 var(--space-sm);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: var(--radius-md);
  color: var(--text);
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 650;
  background: color-mix(in srgb, var(--bg-panel), transparent 8%);
  box-shadow: var(--shadow-rim);
  transition:
    transform var(--duration-fast) var(--ease-standard),
    background var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard);
}

.github-link-btn:hover {
  border-color: color-mix(in srgb, var(--accent), var(--border) 55%);
  background: color-mix(in srgb, var(--bg-panel), var(--accent) 14%);
  transform: translateY(-1px);
}

.github-link-btn:active {
  transform: translateY(0);
}

.top-nav__mode-label {
  color: var(--text-soft);
  font-size: 0.78rem;
  font-weight: 600;
}

.theme-icon-btn {
  border: 1px solid var(--border);
  width: 2.2rem;
  height: 2.2rem;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  color: var(--text);
  background: color-mix(in srgb, var(--bg-panel), transparent 8%);
  box-shadow: var(--shadow-rim);
  cursor: pointer;
  transition:
    transform var(--duration-fast) var(--ease-standard),
    background var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard);
}

.theme-icon-btn:hover {
  border-color: color-mix(in srgb, var(--accent), var(--border) 55%);
  background: color-mix(in srgb, var(--bg-panel), var(--accent) 14%);
  transform: translateY(-1px);
}

.theme-icon-btn:active {
  transform: translateY(0);
}

.nav-icon {
  width: 1.1rem;
  height: 1.1rem;
}

@media (max-width: 740px) {
  .top-nav {
    padding: var(--space-sm) var(--space-md);
  }

  .top-nav__mode-label {
    display: none;
  }
}
</style>
