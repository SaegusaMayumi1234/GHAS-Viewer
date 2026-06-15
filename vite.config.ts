import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

const buildSingleFile = process.env.BUILD_SINGLEFILE === 'true'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue(), ...(buildSingleFile ? [viteSingleFile()] : [])],
  build: {
    target: 'es2022',
    cssCodeSplit: !buildSingleFile,
    modulePreload: {
      polyfill: !buildSingleFile,
    },
    assetsInlineLimit: buildSingleFile ? 999999999 : 4096,
  },
})
