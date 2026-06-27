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
    // Outreach (sheet-as-database): service-account key (base64) + target sheet + pace.
    googleSaJson: process.env.GOOGLE_SA_JSON,
    outreachSheetId: process.env.OUTREACH_SHEET_ID,
    outreachPerDay: process.env.OUTREACH_PER_DAY,
    outreachStartHour: process.env.OUTREACH_START_HOUR,
    outreachEndHour: process.env.OUTREACH_END_HOUR,
    outreachMinGap: process.env.OUTREACH_MIN_GAP,
    outreachJitter: process.env.OUTREACH_JITTER,
    public: {}
  },
  compatibilityDate: '2025-01-29',
})