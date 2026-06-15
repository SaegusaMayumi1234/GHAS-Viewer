import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'ghas-viewer-theme'

const getInitialTheme = (): ThemeMode => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<ThemeMode>(getInitialTheme())

  watch(
    theme,
    (value) => {
      document.documentElement.dataset.theme = value
      localStorage.setItem(STORAGE_KEY, value)
    },
    { immediate: true },
  )

  const isDark = computed(() => theme.value === 'dark')

  const toggleTheme = (): void => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  return {
    theme,
    isDark,
    toggleTheme,
  }
})
