<template>
    <div class="space-y-6">
        <!-- Top Stats Row -->
        <section v-if="totalRows > 0" class="animate-fade-in-up">
            <StatsWidget 
                :total-rows="totalRows" 
                :columns="columns" 
                :numeric-count="numericColumns.length" 
            />
        </section>

        <!-- Main Workspace -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left Column: Chat & Settings -->
            <div class="lg:col-span-1 space-y-6">
                 <!-- File Upload (Initial State) -->
                <div v-if="totalRows === 0" class="p-8 rounded-2xl bg-slate-800/30 border-2 border-dashed border-slate-700 hover:border-indigo-500/50 transition-colors text-center group">
                    <div class="w-16 h-16 rounded-full bg-slate-800 mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <i class="pi pi-cloud-upload text-2xl text-slate-400 group-hover:text-indigo-400"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-white mb-2">Connect Data Source</h3>
                    <p class="text-slate-400 text-sm mb-6">Upload CSV or Excel files to begin analysis</p>
                    <FileUploader @file-uploaded="handleFileUpload" />
                </div>

                 <!-- Chat Widget (Sticky/Fixed) -->
                <div v-else class="sticky top-24 space-y-4">
                    <ChatWidget :loading="isLoading" @submit="processQuery" />
                    
                    <!-- Query History -->
                    <div v-if="queryHistory.length > 0" class="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
                        <h4 class="text-xs font-semibold text-slate-500 uppercase mb-3">Recent Queries</h4>
                        <div class="space-y-2">
                             <div v-for="item in queryHistory.slice(0, 5)" :key="item.id" 
                                class="p-2 rounded-lg hover:bg-slate-700/30 cursor-pointer transition-colors text-sm text-slate-300 flex items-center justify-between group"
                                @click="processQuery(item.query)"
                            >
                                <span class="truncate">{{ item.query }}</span>
                                <i class="pi pi-arrow-right opacity-0 group-hover:opacity-100 text-xs text-indigo-400"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Column: Results & Visualization -->
            <div class="lg:col-span-2 space-y-6">
                 <!-- Initial Empty State -->
                <div v-if="!analysisResult && totalRows > 0 && !isLoading" class="h-96 rounded-2xl bg-slate-800/20 border border-slate-800 border-dashed flex flex-col items-center justify-center text-slate-500">
                    <i class="pi pi-chart-bar text-4xl mb-4 opacity-20"></i>
                    <p>Ask a question to generate insights</p>
                </div>

                <!-- Loading State -->
                <div v-if="isLoading" class="h-96 rounded-2xl bg-slate-800/20 border border-slate-800 animate-pulse flex items-center justify-center">
                    <div class="flex flex-col items-center gap-4">
                        <i class="pi pi-spin pi-spinner text-indigo-500 text-3xl"></i>
                        <span class="text-slate-400 text-sm animate-pulse">Analyzing data structures...</span>
                    </div>
                </div>

                <!-- Results Panel (Reusing logic for now, wrapping later) -->
                <ResultsPanel v-if="analysisResult && !isLoading" :result="analysisResult" />
                
                <!-- Error State -->
                <div v-if="error" class="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-center gap-3">
                     <i class="pi pi-exclamation-triangle"></i>
                     <span>{{ error }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import StatsWidget from '~/components/analytics/StatsWidget.vue';
import ChatWidget from '~/components/analytics/ChatWidget.vue';

const { 
    data, 
    columns, 
    totalRows, 
    numericColumns,
    isLoading, 
    error, 
    analysisResult, 
    queryHistory,
    handleFileUpload, 
    processQuery 
} = useDataAnalysis();
</script>

<style scoped>
.animate-fade-in-up {
    animation: fadeInUp 0.5s ease-out forwards;
}
@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
