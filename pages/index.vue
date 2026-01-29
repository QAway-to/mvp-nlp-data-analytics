<template>
    <div class="space-y-6">
        <!-- Top Stats Row -->
        <section v-if="totalRows > 0" class="animate-fade-in-up">
            <div class="flex justify-end mb-4">
                 <button @click="openSaveDatasetDialog" class="text-sm text-slate-500 hover:text-here-purple-600 font-medium flex items-center gap-2 transition-colors">
                    <i class="pi pi-bookmark"></i>
                    Save this Dataset
                </button>
            </div>
            <StatsWidget 
                :total-rows="totalRows" 
                :columns="columns" 
                :numeric-count="numericColumns.length" 
            />
        </section>

        <!-- Main Workspace -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
            <!-- Left Column: Chat & Settings -->
            <div class="lg:col-span-3 space-y-6 h-full flex flex-col">
                 <!-- File Upload (Initial State) -->
                <div v-if="totalRows === 0" class="p-10 rounded-2xl bg-white dark:bg-slate-800 border-2 border-dashed border-here-gray-200 dark:border-slate-700 hover:border-here-purple-400 dark:hover:border-here-purple-500 transition-all text-center group shadow-sm">
                    <div class="w-16 h-16 rounded-full bg-here-purple-50 dark:bg-here-purple-900/20 mx-auto flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <i class="pi pi-cloud-upload text-2xl text-here-purple-600 dark:text-here-purple-400"></i>
                    </div>
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Connect Data</h3>
                    <p class="text-slate-500 dark:text-slate-400 text-sm mb-6">Drag & Drop or Click to upload CSV/Excel</p>
                    <FileUploader @file-uploaded="handleFileUpload" />
                </div>

                 <!-- Chat Widget (Sticky/Fixed) -->
                <div v-else class="space-y-4 flex-1 flex flex-col">
                    <ChatWidget :loading="isLoading" @submit="processQuery" class="flex-none" />
                    
                    <!-- Query History -->
                    <div v-if="queryHistory.length > 0" class="flex-1 overflow-y-auto custom-scrollbar p-4 rounded-xl bg-white dark:bg-slate-800 border border-here-gray-200 dark:border-slate-700 shadow-sm">
                        <h4 class="text-xs font-bold text-slate-400 uppercase mb-3 px-1">Recent Queries</h4>
                        <div class="space-y-1">
                             <div v-for="item in queryHistory.slice(0, 10)" :key="item.id" 
                                class="p-2.5 rounded-lg hover:bg-here-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors text-sm text-slate-600 dark:text-slate-300 flex items-center justify-between group"
                                @click="processQuery(item.query)"
                            >
                                <span class="truncate font-medium">{{ item.query }}</span>
                                <i class="pi pi-arrow-right opacity-0 group-hover:opacity-100 text-xs text-here-purple-500"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Middle Column: Results & Visualization -->
            <div class="lg:col-span-6 space-y-6 h-full overflow-y-auto custom-scrollbar pr-2">
                 <!-- Initial Empty State -->
                <div v-if="!analysisResult && totalRows > 0 && !isLoading" class="h-full rounded-2xl bg-white dark:bg-slate-800 border border-here-gray-200 dark:border-slate-700 border-dashed flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                    <div class="w-20 h-20 rounded-full bg-here-gray-50 dark:bg-slate-700 flex items-center justify-center mb-4">
                        <i class="pi pi-sparkles text-3xl text-slate-300 dark:text-slate-500"></i>
                    </div>
                    <p class="font-medium">AI Insights will appear here</p>
                </div>

                <!-- Loading State -->
                <div v-if="isLoading" class="h-96 rounded-2xl bg-white dark:bg-slate-800 border border-here-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-center">
                    <div class="flex flex-col items-center gap-4">
                        <i class="pi pi-spin pi-spinner text-here-purple-600 dark:text-here-purple-400 text-4xl"></i>
                        <span class="text-slate-500 dark:text-slate-400 text-sm font-medium animate-pulse">Analyzing data structures...</span>
                    </div>
                </div>

                <!-- Results Panel -->
                <div v-if="analysisResult && !isLoading" class="space-y-4">
                     <div class="flex items-center justify-between">
                        <h2 class="text-lg font-bold text-slate-900 dark:text-white">Analysis Results</h2>
                        <button @click="openSaveDialog" class="text-sm text-here-purple-600 dark:text-here-purple-400 hover:text-here-purple-700 dark:hover:text-here-purple-300 font-medium flex items-center gap-2">
                            <i class="pi pi-save"></i>
                            Save to Reports
                        </button>
                    </div>
                    <ResultsPanel :result="analysisResult" />
                </div>
                
                <!-- Error State -->
                <div v-if="error" class="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-3">
                     <i class="pi pi-exclamation-circle text-xl"></i>
                     <span class="font-medium">{{ error }}</span>
                </div>
            </div>

            <!-- Right Column: Activity Feed -->
            <div class="lg:col-span-3 h-full">
                <ActivityFeed />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import StatsWidget from '~/components/analytics/StatsWidget.vue';
import ChatWidget from '~/components/analytics/ChatWidget.vue';
import ActivityFeed from '~/components/ActivityFeed.vue';

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
    processQuery,
    saveCurrentReport,
    saveDataset
} = useDataAnalysis();

const openSaveDialog = () => {
    const title = prompt('Enter a title for this report:', `Analysis ${new Date().toLocaleTimeString()}`);
    if (title) {
        saveCurrentReport(title);
        alert('Report saved!');
    }
};

const openSaveDatasetDialog = () => {
    const name = prompt('Enter a name for this dataset:', `Dataset ${new Date().toLocaleDateString()}`);
    if (name) {
        saveDataset(name);
        alert('Dataset saved!');
    }
};
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
