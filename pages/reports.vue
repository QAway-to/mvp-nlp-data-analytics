<template>
    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Saved Reports</h1>
                <p class="text-slate-500 dark:text-slate-400 text-sm">Access your historical AI insights and visualizations.</p>
            </div>
            <div class="flex gap-2">
                 <div class="relative">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input 
                        v-model="search"
                        type="text" 
                        placeholder="Search reports..." 
                        class="pl-9 pr-4 py-2 rounded-lg border border-here-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-here-purple-500 focus:border-here-purple-500 outline-none"
                    />
                </div>
            </div>
        </div>

        <!-- Grid -->
        <div v-if="filteredReports.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="report in filteredReports" :key="report.id" 
                class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-here-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group relative"
            >
                <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button @click="loadAndNavigate(report)" class="p-2 bg-here-purple-50 dark:bg-here-purple-900/20 text-here-purple-600 dark:text-here-purple-400 rounded-lg hover:bg-here-purple-100 dark:hover:bg-here-purple-900/40 transition-colors" title="Load Report">
                        <i class="pi pi-external-link"></i>
                    </button>
                    <button @click="deleteReport(report.id)" class="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors" title="Delete">
                        <i class="pi pi-trash"></i>
                    </button>
                </div>

                <div class="flex items-start gap-4 mb-4">
                    <div class="w-10 h-10 rounded-lg bg-here-purple-50 dark:bg-here-purple-900/20 flex items-center justify-center text-here-purple-600 dark:text-here-purple-400 shrink-0">
                        <i class="pi" :class="report.result.chart ? 'pi-chart-bar' : 'pi-file-o'"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-900 dark:text-white line-clamp-1">{{ report.title }}</h3>
                        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                            <i class="pi pi-calendar"></i>
                            {{ new Date(report.date).toLocaleDateString() }}
                        </div>
                    </div>
                </div>
                
                <div class="p-3 bg-here-gray-50 dark:bg-slate-700/50 rounded-lg text-sm text-slate-600 dark:text-slate-300 line-clamp-3 mb-4 h-20">
                    {{ report.result.message }}
                </div>

                <div class="flex items-center gap-2">
                    <span class="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-medium">
                        {{ report.result.type }}
                    </span>
                     <span class="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-medium truncate max-w-[150px]">
                        {{ report.query }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-here-gray-200 dark:border-slate-700 border-dashed">
            <div class="w-16 h-16 bg-here-gray-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="pi pi-folder-open text-2xl text-slate-400 dark:text-slate-500"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">No reports found</h3>
            <p class="text-slate-500 dark:text-slate-400 text-sm mb-6">Create saved reports from your analysis dashboard.</p>
            <router-link to="/" class="px-4 py-2 bg-here-purple-600 text-white rounded-lg font-medium hover:bg-here-purple-700 transition-colors">
                Go to Dashboard
            </router-link>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { SavedReport } from '~/types';

const router = useRouter();
const { savedReports, deleteReport, loadReport } = useDataAnalysis();
const search = ref('');

const filteredReports = computed(() => {
    if (!search.value) return savedReports.value;
    const q = search.value.toLowerCase();
    return savedReports.value.filter((r: SavedReport) => 
        r.title.toLowerCase().includes(q) || 
        r.query.toLowerCase().includes(q)
    );
});

const loadAndNavigate = (report: SavedReport) => {
    loadReport(report);
    router.push('/');
};
</script>
