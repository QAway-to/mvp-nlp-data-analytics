// https://nuxt.com/docs/api/configuration/nuxt-config
import Aura from '@primevue/themes/aura';

export default defineNuxtConfig({
  devtools: { enabled: true },
  srcDir: '.',
  modules: [
    '@primevue/nuxt-module',
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt'
  ],
  css: [
    './assets/css/main.css',
    'primeicons/primeicons.css'
  ],
  primevue: {
    options: {
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.dark', // or 'system'
        }
      },
      ripple: true
    },
    components: {
      exclude: ['Editor', 'Chart'] // Chart we might import manually or use via chart.js
    }
  },
  runtimeConfig: {
    geminiApiKey: process.env.GEMINI_API_KEY,
    public: {
      // Public keys
    }
  },
  compatibilityDate: '2025-01-29',
})
