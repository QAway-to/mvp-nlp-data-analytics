<template>
    <div class="flex flex-col h-[calc(100vh-6rem)] sm:h-[calc(100vh-7rem)] lg:h-[calc(100vh-9rem)] relative">
        
        <!-- Top Controls & Pipeline Visualization -->
        <div class="flex-none mb-4 space-y-4">
             <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                     <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        Deals Pipeline
                        <span class="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                            {{ pipelineReport.period }}
                        </span>
                     </h1>
                </div>
                <!-- Actions -->
                <div class="flex gap-2">
                     <div class="flex -space-x-1 mr-4">
                        <!-- Mock Avatar Stack -->
                        <div class="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-gray-200 flex items-center justify-center text-xs font-bold text-slate-600">IZ</div>
                        <div class="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-gray-200 flex items-center justify-center text-xs font-bold text-slate-600">VT</div>
                        <button class="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <i class="pi pi-plus text-xs"></i>
                        </button>
                     </div>
                     <button class="flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm text-sm font-medium">
                        <i class="pi pi-cog"></i>
                    </button>
                    <button class="flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm text-sm font-medium">
                        <i class="pi pi-search"></i>
                        <span class="hidden sm:inline">Search</span>
                    </button>
                    <button class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/30 text-sm font-medium">
                        <i class="pi pi-plus"></i>
                        <span class="hidden sm:inline">Add Deal</span>
                    </button>
                </div>
            </div>

            <!-- Pipeline Summary Bar (Bitrix Style) -->
            <div class="flex w-full h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
                 <div v-for="col in stages" :key="col.id" 
                      class="flex-1 flex flex-col justify-center px-4 border-r last:border-r-0 border-slate-100 dark:border-slate-700 relative group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                    <!-- Stage Color Line -->
                    <div class="absolute top-0 left-0 right-0 h-1" :style="{ backgroundColor: col.color }"></div>
                    
                    <div class="flex justify-between items-center">
                        <span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase truncate pr-2">{{ col.label }}</span>
                        <div class="text-xs font-bold text-slate-700 dark:text-slate-200">
                            {{ formatCompactNumber(getStageTotal(col.id)) }}
                        </div>
                    </div>
                 </div>
            </div>
        </div>

        <!-- Kanban Board -->
        <div class="flex-1 overflow-x-auto overflow-y-hidden pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
             <div class="inline-flex h-full gap-3 align-top">
                <!-- Column -->
                <div v-for="col in stages" :key="col.id" 
                    class="w-80 flex-shrink-0 flex flex-col h-full rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-transparent transition-colors duration-200"
                    :class="{'!bg-blue-50/80 dark:!bg-blue-900/20 ring-2 ring-blue-300 dark:ring-blue-700': draggedDeal && draggedDeal.sourceStageId !== col.id}"
                    @dragover.prevent 
                    @dragenter.prevent
                    @drop="onDrop($event, col.id)"
                >
                    <!-- Column Header -->
                    <div class="flex-none p-3 border-t-4 rounded-t-xl bg-white dark:bg-slate-800 shadow-sm border-x border-b border-slate-200 dark:border-slate-700"
                         :style="{ borderTopColor: col.color }"
                    >
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="font-bold text-slate-700 dark:text-slate-200 text-sm">{{ col.label }}</h3>
                            <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <i class="pi pi-ellipsis-h"></i>
                            </button>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">{{ col.deals.length }} deals</span>
                            <span class="text-sm font-bold text-slate-700 dark:text-slate-300">{{ formatCurrency(getStageTotal(col.id)) }}</span>
                        </div>
                    </div>

                    <!-- Layout for cards (Scrollable) -->
                    <div class="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
                         <div v-for="deal in col.deals" :key="deal.id" 
                            class="group bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative"
                            draggable="true"
                            @dragstart="onDragStart($event, deal, col.id)"
                            @click="selectedDeal = deal"
                         >
                            <!-- Deal Title & Value -->
                            <div class="mb-2">
                                <h4 class="font-semibold text-blue-600 dark:text-blue-400 text-sm hover:underline cursor-pointer">{{ deal.title }}</h4>
                                <div class="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{{ formatCurrency(deal.value, deal.currency) }}</div>
                            </div>

                            <!-- Client / Contact -->
                            <div class="flex items-center gap-2 mb-3">
                                <div class="w-6 h-6 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                                    <i class="pi pi-building text-[10px]"></i>
                                </div>
                                <div class="text-xs text-slate-600 dark:text-slate-400 truncate flex-1">
                                    {{ deal.company }}
                                    <span v-if="deal.contact_name" class="text-slate-400 dark:text-slate-500 mx-1">•</span>
                                    <span v-if="deal.contact_name">{{ deal.contact_name }}</span>
                                </div>
                            </div>

                            <!-- Tags & Probability -->
                            <div class="flex items-center gap-2 mb-3 flex-wrap">
                                <span class="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border" :class="tagColor(deal.type)">
                                    {{ deal.type }}
                                </span>
                                <span v-if="deal.probability" class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                                    {{ deal.probability }}%
                                </span>
                            </div>

                            <!-- Footer: Activity & Owner -->
                            <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
                                <!-- Next Activity -->
                                <div class="flex items-center gap-1.5 text-xs" :class="getActivityColor(deal.next_activity_date)">
                                    <i class="pi" :class="getActivityIcon(deal.next_activity_type)"></i>
                                    <span>{{ formatRelativeDate(deal.next_activity_date) }}</span>
                                </div>

                                <!-- Owner Avatar -->
                                <div v-if="deal.avatar" class="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-600 overflow-hidden" title="Manager">
                                    <img :src="deal.avatar" class="w-full h-full object-cover">
                                </div>
                                <div v-else class="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-600 bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-[9px] font-bold text-indigo-600 dark:text-indigo-400" title="Manager">
                                    {{ deal.ownerInitials }}
                                </div>
                            </div>

                            <!-- Quick Actions Overlay (Hover) -->
                            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/90 dark:bg-slate-800/90 rounded-md shadow-sm p-0.5 backdrop-blur-sm">
                                <button class="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-colors" title="Call">
                                    <i class="pi pi-phone text-xs"></i>
                                </button>
                                <button class="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-green-600 transition-colors" title="Email">
                                    <i class="pi pi-envelope text-xs"></i>
                                </button>
                                <button class="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-purple-600 transition-colors" title="Chat">
                                    <i class="pi pi-comments text-xs"></i>
                                </button>
                            </div>
                         </div>
                    </div>
                </div>
             </div>
        </div>

        <!-- Deal Details Side Panel -->
        <div v-if="selectedDeal" 
             class="absolute inset-y-0 right-0 w-full sm:w-[400px] bg-white dark:bg-slate-800 shadow-2xl border-l border-slate-200 dark:border-slate-700 transform transition-transform duration-300 z-50 flex flex-col"
        >
            <!-- Header -->
            <div class="flex-none p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start bg-slate-50 dark:bg-slate-900/50">
                <div>
                    <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Deal Details</div>
                    <h2 class="text-lg font-bold text-slate-900 dark:text-white leading-tight">{{ selectedDeal.title }}</h2>
                    <div class="text-sm text-blue-600 font-semibold mt-1">{{ formatCurrency(selectedDeal.value, selectedDeal.currency) }}</div>
                </div>
                <button @click="selectedDeal = null" class="text-slate-400 hover:text-slate-600 transition-colors">
                    <i class="pi pi-times text-lg"></i>
                </button>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-4 space-y-6">
                 <!-- Status Stepper -->
                 <div>
                    <label class="text-xs font-semibold text-slate-500 mb-2 block">Stage</label>
                    <div class="flex gap-1 h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                        <div v-for="s in stages" :key="s.id" 
                             class="flex-1"
                             :class="{
                                 'opacity-100': true,
                                 'bg-slate-300 dark:bg-slate-600': s.id !== selectedDeal.status,
                             }"
                             :style="{ backgroundColor: s.id === selectedDeal.status || stages.findIndex(st => st.id === selectedDeal.status) > stages.findIndex(st => st.id === s.id) ? s.color : '' }"
                        ></div>
                    </div>
                    <div class="mt-1 text-xs text-right font-medium" :style="{ color: stages.find(s => s.id === selectedDeal.status)?.color }">
                        {{ stages.find(s => s.id === selectedDeal.status)?.label }}
                    </div>
                 </div>

                 <!-- Client Info -->
                 <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                    <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-3">Client Information</h3>
                    <div class="space-y-2">
                        <div class="flex items-center gap-3">
                             <div class="w-8 h-8 rounded bg-white dark:bg-slate-700 flex items-center justify-center text-slate-500 border border-slate-200 dark:border-slate-600 shadow-sm">
                                <i class="pi pi-building"></i>
                            </div>
                            <div>
                                <div class="text-sm font-semibold text-slate-900 dark:text-white">{{ selectedDeal.company }}</div>
                                <div class="text-xs text-slate-500">Target Account</div>
                            </div>
                        </div>
                        <div v-if="selectedDeal.contact_name" class="flex items-center gap-3">
                             <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 shadow-sm">
                                <span class="text-xs font-bold">{{ selectedDeal.contact_name.charAt(0) }}</span>
                            </div>
                            <div>
                                <div class="text-sm font-semibold text-slate-900 dark:text-white">{{ selectedDeal.contact_name }}</div>
                                <div class="text-xs text-slate-500">{{ selectedDeal.contact_email || 'No email' }}</div>
                            </div>
                        </div>
                    </div>
                 </div>

                 <!-- NLP Analysis (If available - leveraging the theme) -->
                 <div v-if="selectedDeal.nlp_analysis" class="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
                     <h3 class="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-2 flex items-center gap-2">
                        <i class="pi pi-sparkles"></i> AI Insights
                    </h3>
                    <div class="text-sm text-indigo-800 dark:text-indigo-300">
                        Deal risk score is <strong>{{ selectedDeal.nlp_analysis.risk_score }}</strong>. Sentiment appears <strong>{{ selectedDeal.nlp_analysis.summary_sentiment }}</strong>.
                    </div>
                 </div>

                 <!-- Activity Stream Mock -->
                 <div>
                    <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-3">Planned Activities</h3>
                    <div class="space-y-3">
                        <div class="flex gap-3 relative pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                            <div class="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-800"></div>
                            <div>
                                <div class="text-sm font-medium text-slate-900 dark:text-white">Follow-up Call</div>
                                <div class="text-xs text-slate-500">Tomorrow at 10:00 AM</div>
                            </div>
                        </div>
                        <div class="flex gap-3 relative pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                            <div class="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 ring-4 ring-white dark:ring-slate-800"></div>
                            <div>
                                <div class="text-sm font-medium text-slate-900 dark:text-white">Proposal Review</div>
                                <div class="text-xs text-slate-500">Completed yesterday</div>
                            </div>
                        </div>
                    </div>
                 </div>
            </div>
            
            <!-- Footer Actions -->
            <div class="flex-none p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex gap-2">
                 <button class="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm shadow-blue-500/30 transition-colors">
                    Edit Deal
                 </button>
                 <button class="flex-1 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-semibold transition-colors">
                    Move Stage
                 </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Custom scrollbar for columns */
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #cbd5e1;
    border-radius: 4px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #475569;
}
</style>

<script setup lang="ts">
import { ref } from 'vue';
import type { Deal } from '~/types';
import { useDeals } from '~/composables/useDeals';
import { useDateFormat, useTimeAgo } from '@vueuse/core';

const { stages, moveDeal, getStageTotal, pipelineReport } = useDeals();

// Selection
const selectedDeal = ref<Deal | null>(null);

// Helpers
const formatCurrency = (value: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
};

const formatCompactNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
};

const formatRelativeDate = (date?: Date) => {
    if (!date) return 'No activity';
    return useTimeAgo(date).value; // Requires @vueuse/core
};

const tagColor = (type: string) => {
    switch (type) {
        case 'B2B': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
        case 'B2C': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800';
        default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
};

const getActivityColor = (date?: Date) => {
    if (!date) return 'text-slate-400';
    const now = new Date();
    if (date < now) return 'text-red-500 font-medium'; // Overdue
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 2) return 'text-amber-500 font-medium'; // Due soon
    return 'text-slate-500';
};

const getActivityIcon = (type?: string) => {
    switch (type) {
        case 'call': return 'pi-phone';
        case 'email': return 'pi-envelope';
        case 'meeting': return 'pi-users';
        default: return 'pi-clock';
    }
};

// Drag and Drop Logic
const draggedDeal = ref<{ deal: Deal; sourceStageId: string } | null>(null);

const onDragStart = (event: DragEvent, deal: Deal, stageId: string) => {
    draggedDeal.value = { deal, sourceStageId: stageId };
    
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.dropEffect = 'move';
        // Optional: Set custom drag image if needed
    }
    // Close detail panel on drag start to avoid confusion
    selectedDeal.value = null;
};

const onDrop = (event: DragEvent, targetStageId: string) => {
    if (!draggedDeal.value) return;

    const { deal, sourceStageId } = draggedDeal.value;

    moveDeal(deal, sourceStageId, targetStageId);

    // Reset
    draggedDeal.value = null;
};
</script>
