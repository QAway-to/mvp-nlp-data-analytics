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
          darkModeSelector: '.dark',
        }
      },
      ripple: true
    },
    components: {
      exclude: ['Editor', 'Chart']
    }
  },
  runtimeConfig: {
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    databaseUrl: process.env.DATABASE_URL,
    deepSeekKey: process.env.DEEP_SEEK,
    llmBaseUrl: process.env.LLM_BASE_URL,
    llmModel: process.env.LLM_MODEL,
    cronSecret: process.env.CRON_SECRET,
    public: {}
  },
  compatibilityDate: '2025-01-29',
})