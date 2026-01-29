<template>
    <div class="min-h-screen bg-here-gray-50 flex font-sans text-slate-600 selection:bg-here-purple-100 selection:text-here-purple-700">
        <!-- Sidebar -->
        <aside 
            class="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-here-gray-200 transition-transform duration-300 lg:translate-x-0 lg:static lg:block flex flex-col"
            :class="[isSidebarOpen ? 'translate-x-0' : '-translate-x-full']"
        >
            <!-- Logo area -->
            <div class="h-16 flex items-center px-6 border-b border-here-gray-100">
                <div class="w-8 h-8 rounded-lg bg-here-purple-600 flex items-center justify-center shadow-lg shadow-here-purple-500/20 mr-3">
                    <i class="pi pi-bolt text-white text-lg"></i>
                </div>
                <span class="text-lg font-bold text-here-gray-900 tracking-tight">
                    HereCRM
                </span>
            </div>

            <!-- Nav -->
            <div class="p-4 space-y-1 flex-1 overflow-y-auto">
                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3 mt-4">
                    Workspace
                </div>
                
                <router-link to="/" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group" 
                    :class="route.path === '/' ? 'bg-here-purple-50 text-here-purple-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'">
                    <i class="pi pi-chart-bar" :class="route.path === '/' ? 'text-here-purple-600' : 'text-slate-400 group-hover:text-slate-600'"></i>
                    Dashboard
                </router-link>
                
                <router-link to="/datasets" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group"
                    :class="route.path === '/datasets' ? 'bg-here-purple-50 text-here-purple-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
                >
                    <i class="pi pi-folder" :class="route.path === '/datasets' ? 'text-here-purple-600' : 'text-slate-400 group-hover:text-slate-600'"></i>
                    My Datasets
                </router-link>

                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3 mt-8">
                    Analytics
                </div>
                 <router-link to="/reports" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group"
                     :class="route.path === '/reports' ? 'bg-here-purple-50 text-here-purple-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
                 >
                    <i class="pi pi-bookmark" :class="route.path === '/reports' ? 'text-here-purple-600' : 'text-slate-400 group-hover:text-slate-600'"></i>
                    Saved Reports
                </router-link>
            </div>

            <!-- Bottom User -->
             <div class="p-4 border-t border-here-gray-100">
                <router-link to="/settings" class="flex items-center gap-3 px-2 py-2 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors">
                    <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
                        IZ
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-semibold text-slate-900 truncate">Ilya Zaigralov</div>
                        <div class="text-xs text-slate-500 truncate">Settings</div>
                    </div>
                    <i class="pi pi-cog text-slate-400 text-xs"></i>
                </router-link>
            </div>
        </aside>

        <!-- Overlay -->
        <div 
            v-if="isSidebarOpen"
            class="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm"
            @click="isSidebarOpen = false"
        ></div>

        <!-- Main Content -->
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden bg-here-gray-50">
            <!-- Header -->
            <header class="h-16 bg-white border-b border-here-gray-200 flex items-center justify-between px-4 sm:px-6 z-30 sticky top-0 shadow-sm/50">
                <div class="flex items-center gap-4">
                    <button @click="isSidebarOpen = !isSidebarOpen" class="lg:hidden p-2 text-slate-500 hover:text-slate-900">
                        <i class="pi pi-bars text-xl"></i>
                    </button>
                    
                    <!-- Project Selector Mock -->
                    <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-here-gray-100 rounded-lg hover:bg-here-gray-200 cursor-pointer transition-colors border border-transparent hover:border-here-gray-300">
                        <div class="w-5 h-5 rounded bg-white border border-here-gray-300 flex items-center justify-center">
                            <span class="text-[10px] font-bold text-slate-700">P</span>
                        </div>
                        <span class="text-sm font-semibold text-slate-700">Project: NLP Analytics</span>
                        <i class="pi pi-chevron-down text-xs text-slate-500 ml-1"></i>
                    </div>
                </div>

                <div class="flex items-center gap-3">
                     <button class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-here-purple-600 bg-here-purple-50 rounded-lg hover:bg-here-purple-100 transition-colors">
                        <i class="pi pi-plus text-xs"></i>
                        <span>New Report</span>
                    </button>
                    <div class="h-8 w-px bg-here-gray-200 mx-1"></div>
                    <button class="p-2 text-slate-400 hover:text-slate-600 transition-colors relative">
                        <i class="pi pi-bell text-lg"></i>
                        <span class="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border-2 border-white"></span>
                    </button>
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
