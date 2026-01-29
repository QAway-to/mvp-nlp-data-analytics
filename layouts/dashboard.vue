<template>
    <div class="min-h-screen bg-slate-950 flex font-sans text-slate-200 selection:bg-indigo-500/30">
        <!-- Sidebar -->
        <aside 
            class="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800 transition-transform duration-300 lg:translate-x-0 lg:static lg:block"
            :class="[isSidebarOpen ? 'translate-x-0' : '-translate-x-full']"
        >
            <div class="h-16 flex items-center px-6 border-b border-slate-800">
                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mr-3">
                    <i class="pi pi-bolt text-white text-lg"></i>
                </div>
                <span class="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    HereCRM
                </span>
            </div>

            <div class="p-4 space-y-1">
                <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3 mt-4">
                    Analytics
                </div>
                <router-link to="/" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-slate-800/50 hover:text-white" :class="{ 'bg-slate-800 text-white': route.path === '/' }">
                    <i class="pi pi-chart-bar text-indigo-400"></i>
                    Dashboard
                </router-link>
                <a href="#" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-white transition-colors">
                    <i class="pi pi-file text-slate-500"></i>
                    Reports (Soon)
                </a>

                <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3 mt-8">
                    System
                </div>
                <a href="#" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-white transition-colors">
                    <i class="pi pi-cog text-slate-500"></i>
                    Settings
                </a>
            </div>
        </aside>

        <!-- Overlay -->
        <div 
            v-if="isSidebarOpen"
            class="fixed inset-0 bg-black/50 z-40 lg:hidden glass-overlay"
            @click="isSidebarOpen = false"
        ></div>

        <!-- Main Content -->
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
            <!-- Header -->
            <header class="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 z-30 sticky top-0">
                <div class="flex items-center gap-4">
                    <button @click="isSidebarOpen = !isSidebarOpen" class="lg:hidden p-2 text-slate-400 hover:text-white">
                        <i class="pi pi-bars text-xl"></i>
                    </button>
                    <!-- Breadcrumbs Placeholder -->
                    <div class="hidden sm:flex items-center text-sm text-slate-400">
                        <span>Workspace</span>
                        <i class="pi pi-chevron-right text-xs mx-2 opacity-50"></i>
                        <span class="text-white">Analytics Dashboard</span>
                    </div>
                </div>

                <div class="flex items-center gap-4">
                    <div class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center cursor-pointer hover:border-slate-600 transition-colors">
                        <i class="pi pi-user text-slate-400"></i>
                    </div>
                </div>
            </header>

            <!-- Page Content -->
            <main class="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                <slot />
            </main>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';

const isSidebarOpen = ref(false);
const route = useRoute();
</script>

<style scoped>
.glass-overlay {
    backdrop-filter: blur(4px);
}
</style>
