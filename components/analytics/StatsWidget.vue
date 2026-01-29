<template>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Rows Card -->
        <div class="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm shadow-sm relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
            <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all">
                <i class="pi pi-table text-4xl text-indigo-400"></i>
            </div>
            <div class="text-sm font-medium text-slate-400 mb-1">Total Rows</div>
            <div class="text-2xl font-bold text-white tracking-tight">
                {{ totalRows }}
            </div>
            <div class="text-xs text-indigo-400 mt-2 flex items-center gap-1" v-if="totalRows > 0">
                <i class="pi pi-check-circle"></i>
                <span>Ready for analysis</span>
            </div>
        </div>

        <!-- Columns Card -->
        <div class="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm shadow-sm relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
            <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all">
                 <i class="pi pi-list text-4xl text-purple-400"></i>
            </div>
            <div class="text-sm font-medium text-slate-400 mb-1">Variables</div>
            <div class="text-2xl font-bold text-white tracking-tight">
                {{ columns.length }}
            </div>
             <div class="text-xs text-purple-400 mt-2 flex items-center gap-1" v-if="columns.length > 0">
                <i class="pi pi-database"></i>
                <span>Columns detected</span>
            </div>
        </div>
        
         <!-- Numeric Cols -->
        <div class="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
             <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all">
                 <i class="pi pi-calculator text-4xl text-emerald-400"></i>
            </div>
            <div class="text-sm font-medium text-slate-400 mb-1">Numeric Metric</div>
            <div class="text-2xl font-bold text-white tracking-tight">
                {{ numericCount }}
            </div>
             <div class="text-xs text-emerald-400 mt-2 flex items-center gap-1" v-if="numericCount > 0">
                <i class="pi pi-chart-line"></i>
                <span>Analyzable metrics</span>
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
