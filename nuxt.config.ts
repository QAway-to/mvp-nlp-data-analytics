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
    public: {}
  },
  compatibilityDate: '2025-01-29',
})