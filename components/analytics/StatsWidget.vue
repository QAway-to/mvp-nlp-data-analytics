<template>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Rows Card -->
        <div class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-here-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
            <div class="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                 <i class="pi pi-table text-lg"></i>
            </div>
            <div>
                <div class="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                    {{ totalRows }}
                </div>
                <div class="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Total Rows</div>
            </div>
        </div>

        <!-- Columns Card -->
        <div class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-here-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
             <div class="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
                 <i class="pi pi-list text-lg"></i>
            </div>
            <div>
                <div class="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                    {{ columns.length }}
                </div>
                <div class="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Variables</div>
            </div>
        </div>
        
         <!-- Numeric Cols -->
        <div class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-here-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
             <div class="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                 <i class="pi pi-chart-line text-lg"></i>
            </div>
            <div>
                <div class="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                    {{ numericCount }}
                </div>
                <div class="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Analyzable metrics</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    totalRows: number;
    columns: string[];
    numericCount: number;
}>();
</script>
