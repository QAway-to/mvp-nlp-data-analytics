<template>
    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">My Datasets</h1>
                <p class="text-slate-500 dark:text-slate-400 text-sm">Manage your uploaded data files.</p>
            </div>
             <button @click="router.push('/')" class="flex items-center gap-2 px-4 py-2 bg-here-purple-600 text-white rounded-lg hover:bg-here-purple-700 transition-colors shadow-sm shadow-here-purple-500/30">
                <i class="pi pi-plus"></i>
                <span>Upload New</span>
            </button>
        </div>

        <!-- Grid -->
        <div v-if="savedDatasets.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="dataset in savedDatasets" :key="dataset.id" 
                class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-here-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group relative"
            >
                <!-- Actions -->
                <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button @click="loadAndNavigate(dataset)" class="p-2 bg-here-purple-50 dark:bg-here-purple-900/20 text-here-purple-600 dark:text-here-purple-400 rounded-lg hover:bg-here-purple-100 dark:hover:bg-here-purple-900/40 transition-colors" title="Load Data">
                        <i class="pi pi-upload"></i>
                    </button>
                    <button @click="deleteDataset(dataset.id)" class="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors" title="Delete">
                        <i class="pi pi-trash"></i>
                    </button>
                </div>

                <div class="flex items-start gap-4 mb-4">
                    <div class="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                        <i class="pi pi-database"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-900 dark:text-white line-clamp-1">{{ dataset.name }}</h3>
                        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                            <i class="pi pi-calendar"></i>
                            {{ new Date(dataset.date).toLocaleDateString() }}
                        </div>
                    </div>
                </div>
                
                <div class="space-y-2 mt-4">
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-slate-500 dark:text-slate-400">Rows</span>
                        <span class="font-medium text-slate-700 dark:text-slate-200">{{ dataset.data.length }}</span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-slate-500 dark:text-slate-400">Columns</span>
                        <span class="font-medium text-slate-700 dark:text-slate-200">{{ dataset.columns.length }}</span>
                    </div>
                </div>

                <div class="mt-4 pt-4 border-t border-here-gray-100 dark:border-slate-700 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <span v-for="col in dataset.columns.slice(0, 3)" :key="col" class="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded text-xs truncate max-w-[80px]">
                        {{ col }}
                    </span>
                    <span v-if="dataset.columns.length > 3" class="px-2 py-1 bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 rounded text-xs">
                        +{{ dataset.columns.length - 3 }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-here-gray-200 dark:border-slate-700 border-dashed">
            <div class="w-16 h-16 bg-here-gray-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="pi pi-database text-2xl text-slate-400 dark:text-slate-500"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">No saved datasets</h3>
            <p class="text-slate-500 dark:text-slate-400 text-sm mb-6">Upload files on the dashboard and save them here.</p>
            <router-link to="/" class="px-4 py-2 bg-here-purple-600 text-white rounded-lg font-medium hover:bg-here-purple-700 transition-colors">
                Go to Dashboard
            </router-link>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { SavedDataset } from '~/types';

const router = useRouter();
const { savedDatasets, deleteDataset, loadDataset } = useDataAnalysis();

const loadAndNavigate = (dataset: SavedDataset) => {
    loadDataset(dataset);
    router.push('/');
};
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>
