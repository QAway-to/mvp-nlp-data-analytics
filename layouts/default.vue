<template>
  <div class="min-h-screen bg-slate-900 text-slate-50 font-sans selection:bg-indigo-500 selection:text-white">
    <header class="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-3">
            <NuxtLink to="/" class="flex items-center gap-3 group">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <i class="pi pi-bolt text-white text-lg"></i>
              </div>
              <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                NLP Lead Generator
              </h1>
            </NuxtLink>
            <span v-if="leadCount > 0" class="ml-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full px-2 py-0.5 leading-none">{{ leadCount }} leads</span>
          </div>
          <div class="flex items-center gap-4">
            <a href="https://github.com/QAway-to/mvp-nlp-data-analytics" target="_blank" class="text-slate-400 hover:text-white transition-colors">
              <i class="pi pi-github text-xl"></i>
            </a>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>

    <footer class="border-t border-white/5 mt-auto py-8 bg-slate-900">
      <div class="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
        Powered by OpenRouter AI &amp; NLP Lead Generation
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const { stats } = useLeads()
const leadCount = computed(() => stats.value.total)
</script>

<style scoped>
/* Scoped layout styles */
</style>