<template>
  <div class="min-h-screen bg-slate-900 text-slate-50 font-sans selection:bg-indigo-500 selection:text-white">
    <header class="border-b border-white/10 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-14">
          <div class="flex items-center gap-3">
            <div class="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
              <i class="pi pi-bolt text-white text-sm"></i>
            </div>
            <span class="text-sm font-semibold text-slate-100 tracking-tight">NLP Data Analytics</span>
          </div>
          <div class="flex items-center gap-4">
            <a href="https://github.com/QAway-to/mvp-nlp-data-analytics" target="_blank" class="text-slate-500 hover:text-slate-300 transition-colors">
              <i class="pi pi-github text-lg"></i>
            </a>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>

    <footer class="border-t border-white/5 mt-auto py-6">
      <div class="max-w-7xl mx-auto px-4 text-center text-slate-600 text-xs">
        Powered by Vercel AI SDK &amp; Gemini
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
</script>