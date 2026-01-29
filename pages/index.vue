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
                <div v-if="totalRows === 0" class="p-10 rounded-2xl bg-white border-2 border-dashed border-here-gray-200 hover:border-here-purple-400 transition-all text-center group shadow-sm">
                    <div class="w-16 h-16 rounded-full bg-here-purple-50 mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <i class="pi pi-cloud-upload text-2xl text-here-purple-600"></i>
                    </div>
                    <h3 class="text-lg font-bold text-slate-900 mb-2">Connect Data</h3>
                    <p class="text-slate-500 text-sm mb-6">Drag & Drop or Click to upload CSV/Excel</p>
                    <FileUploader @file-uploaded="handleFileUpload" />
                </div>

                 <!-- Chat Widget (Sticky/Fixed) -->
                <div v-else class="sticky top-24 space-y-4">
                    <ChatWidget :loading="isLoading" @submit="processQuery" />
                    
                    <!-- Query History -->
                    <div v-if="queryHistory.length > 0" class="p-4 rounded-xl bg-white border border-here-gray-200 shadow-sm">
                        <h4 class="text-xs font-bold text-slate-400 uppercase mb-3 px-1">Recent Queries</h4>
                        <div class="space-y-1">
                             <div v-for="item in queryHistory.slice(0, 5)" :key="item.id" 
                                class="p-2.5 rounded-lg hover:bg-here-gray-50 cursor-pointer transition-colors text-sm text-slate-600 flex items-center justify-between group"
                                @click="processQuery(item.query)"
                            >
                                <span class="truncate font-medium">{{ item.query }}</span>
                                <i class="pi pi-arrow-right opacity-0 group-hover:opacity-100 text-xs text-here-purple-500"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Column: Results & Visualization -->
            <div class="lg:col-span-2 space-y-6">
                 <!-- Initial Empty State -->
                <div v-if="!analysisResult && totalRows > 0 && !isLoading" class="h-96 rounded-2xl bg-white border border-here-gray-200 border-dashed flex flex-col items-center justify-center text-slate-400">
                    <div class="w-20 h-20 rounded-full bg-here-gray-50 flex items-center justify-center mb-4">
                        <i class="pi pi-sparkles text-3xl text-slate-300"></i>
                    </div>
                    <p class="font-medium">AI Insights will appear here</p>
                </div>

                <!-- Loading State -->
                <div v-if="isLoading" class="h-96 rounded-2xl bg-white border border-here-gray-200 shadow-sm flex items-center justify-center">
                    <div class="flex flex-col items-center gap-4">
                        <i class="pi pi-spin pi-spinner text-here-purple-600 text-4xl"></i>
                        <span class="text-slate-500 text-sm font-medium animate-pulse">Analyzing data structures...</span>
                    </div>
                </div>

                <!-- Results Panel -->
                <ResultsPanel v-if="analysisResult && !isLoading" :result="analysisResult" />
                
                <!-- Error State -->
                <div v-if="error" class="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center gap-3">
                     <i class="pi pi-exclamation-circle text-xl"></i>
                     <span class="font-medium">{{ error }}</span>
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
