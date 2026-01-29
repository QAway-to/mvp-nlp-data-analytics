<template>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Rows Card -->
        <div class="p-5 rounded-xl bg-white border border-here-gray-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div class="flex justify-between items-start mb-4">
                <div class="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                     <i class="pi pi-table text-xl"></i>
                </div>
            </div>
            
            <div class="text-3xl font-bold text-slate-900 tracking-tight mb-1">
                {{ totalRows }}
            </div>
            <div class="text-sm font-medium text-slate-500">Total Rows</div>
        </div>

        <!-- Columns Card -->
        <div class="p-5 rounded-xl bg-white border border-here-gray-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
             <div class="flex justify-between items-start mb-4">
                <div class="p-2 rounded-lg bg-orange-50 text-orange-600">
                     <i class="pi pi-list text-xl"></i>
                </div>
            </div>
            <div class="text-3xl font-bold text-slate-900 tracking-tight mb-1">
                {{ columns.length }}
            </div>
            <div class="text-sm font-medium text-slate-500">Variables</div>
        </div>
        
         <!-- Numeric Cols -->
        <div class="p-5 rounded-xl bg-white border border-here-gray-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
             <div class="flex justify-between items-start mb-4">
                <div class="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                     <i class="pi pi-chart-line text-xl"></i>
                </div>
            </div>
            <div class="text-3xl font-bold text-slate-900 tracking-tight mb-1">
                {{ numericCount }}
            </div>
            <div class="text-sm font-medium text-slate-500">Analyzable metrics</div>
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
