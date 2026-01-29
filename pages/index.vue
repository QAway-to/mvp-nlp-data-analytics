<template>
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Sidebar / Info Panel -->
        <div class="lg:col-span-4 space-y-6">
            <!-- Upload Section -->
            <section class="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 p-1">
                <FileUploader @file-uploaded="handleFileUpload" />
            </section>

            <!-- Data Stats -->
            <section v-if="totalRows > 0" class="p-6 rounded-xl bg-slate-800 border border-slate-700 animate-fade-in">
                <h3 class="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Dataset Info</h3>
                <div class="grid grid-cols-2 gap-4">
                    <div class="p-4 rounded-lg bg-slate-700/50">
                        <div class="text-2xl font-bold text-white">{{ totalRows }}</div>
                        <div class="text-xs text-slate-400 mt-1">Total Rows</div>
                    </div>
                    <div class="p-4 rounded-lg bg-slate-700/50">
                        <div class="text-2xl font-bold text-indigo-400">{{ columns.length }}</div>
                        <div class="text-xs text-slate-400 mt-1">Columns</div>
                    </div>
                </div>
                <div class="mt-4 pt-4 border-t border-slate-700">
                    <div class="text-xs text-slate-500 mb-2">Columns:</div>
                    <div class="flex flex-wrap gap-2">
                        <span v-for="col in columns" :key="col" class="px-2 py-1 bg-slate-900 rounded text-xs text-slate-300 border border-slate-700">
                            {{ col }}
                        </span>
                    </div>
                </div>
            </section>

             <!-- History -->
             <section v-if="queryHistory.length > 0" class="p-6 rounded-xl bg-slate-800 border border-slate-700">
                <h3 class="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">History</h3>
                <div class="space-y-3">
                    <div v-for="item in queryHistory.slice(0, 5)" :key="item.id" 
                        class="p-3 rounded-lg bg-slate-900/50 hover:bg-slate-700/50 transition-colors cursor-pointer border border-transparent hover:border-slate-600"
                        @click="processQuery(item.query)"
                    >
                        <div class="text-sm text-slate-300">{{ item.query }}</div>
                        <div class="text-xs text-slate-500 mt-1 flex justify-between">
                            <span>{{ new Date(item.timestamp).toLocaleTimeString() }}</span>
                            <span>{{ item.resultType }}</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <!-- Main Content -->
        <div class="lg:col-span-8 space-y-8">
            <!-- Chat Interface -->
            <section class="sticky top-20 z-40 bg-slate-900/80 backdrop-blur-xl p-1 rounded-2xl shadow-2xl shadow-indigo-500/10 border border-slate-700/50">
                <ChatInterface :loading="isLoading" @submit="processQuery" />
            </section>

            <!-- Error Message -->
            <div v-if="error" class="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200">
                <div class="flex items-center gap-2">
                    <i class="pi pi-exclamation-circle"></i>
                    <span>{{ error }}</span>
                </div>
            </div>

            <!-- Loader (Skeleton) -->
            <div v-if="isLoading && !analysisResult" class="space-y-4">
                <div class="h-32 rounded-xl bg-slate-800 animate-pulse"></div>
                <div class="h-64 rounded-xl bg-slate-800 animate-pulse"></div>
            </div>

            <!-- Results -->
            <ResultsPanel v-if="analysisResult && !isLoading" :result="analysisResult" />
            
            <!-- Empty State -->
            <div v-if="!analysisResult && !isLoading && !error" class="flex flex-col items-center justify-center py-20 text-slate-500">
                <i class="pi pi-database text-6xl mb-4 opacity-20"></i>
                <p>Upload data and ask something to start analysis</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const { 
    data, 
    columns, 
    totalRows, 
    isLoading, 
    error, 
    analysisResult,
    queryHistory,
    handleFileUpload, 
    processQuery 
} = useDataAnalysis();
</script>

<style>
.animate-fade-in {
    animation: fadeIn 0.5s ease-out forwards;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
