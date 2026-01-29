<template>
    <div class="flex flex-col h-[calc(100vh-6rem)] sm:h-[calc(100vh-7rem)] lg:h-[calc(100vh-9rem)]">
        <!-- Toolbar -->
        <div class="flex-none flex items-center justify-between mb-4">
            <div>
                <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Deals Pipeline</h1>
                <p class="text-slate-500 dark:text-slate-400 text-sm">Manage your sales process and opportunities.</p>
            </div>
            <div class="flex gap-2">
                 <button class="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-here-gray-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <i class="pi pi-filter"></i>
                    <span class="hidden sm:inline">Filter</span>
                </button>
                <button class="flex items-center gap-2 px-4 py-2 bg-here-purple-600 text-white rounded-lg hover:bg-here-purple-700 transition-colors shadow-sm shadow-here-purple-500/30">
                    <i class="pi pi-plus"></i>
                    <span class="hidden sm:inline">New Deal</span>
                    <span class="sm:hidden">New</span>
                </button>
            </div>
        </div>

        <!-- Kanban Board -->
        <div class="flex-1 overflow-x-auto overflow-y-hidden pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
             <div class="inline-flex h-full gap-4 sm:gap-6 align-top">
                <!-- Column -->
                <div v-for="col in stages" :key="col.id" 
                    class="w-72 sm:w-80 flex-shrink-0 flex flex-col h-full rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-transparent"
                    :class="{'!bg-here-purple-50/50 dark:!bg-here-purple-900/10 ring-2 ring-here-purple-200 dark:ring-here-purple-900': draggedDeal && draggedDeal.sourceStageId !== col.id}"
                    @dragover.prevent 
                    @dragenter.prevent
                    @drop="onDrop($event, col.id)"
                >
                    <!-- Header -->
                    <div class="flex-none flex items-center justify-between p-3">
                        <div class="flex items-center gap-2">
                            <h3 class="font-bold text-slate-700 dark:text-slate-200 text-sm sm:text-base">{{ col.label }}</h3>
                            <span class="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">{{ col.deals.length }}</span>
                        </div>
                        <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <i class="pi pi-ellipsis-h"></i>
                        </button>
                    </div>

                    <!-- Layout for cards (Scrollable) -->
                    <div class="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                         <div v-for="deal in col.deals" :key="deal.id" 
                            class="group bg-white dark:bg-slate-800 p-4 rounded-lg border border-transparent hover:border-here-purple-300 dark:hover:border-here-purple-700 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
                            draggable="true"
                            @dragstart="onDragStart($event, deal, col.id)"
                         >
                            <div class="flex justify-between items-start mb-2">
                                <span class="text-xs font-semibold text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 px-2 py-1 rounded uppercase">
                                    {{ deal.type }}
                                </span>
                                <button class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600">
                                    <i class="pi pi-pencil text-xs"></i>
                                </button>
                            </div>
                            <h4 class="font-bold text-slate-900 dark:text-white mb-1 text-sm sm:text-base">{{ deal.title }}</h4>
                            <div class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-3">{{ deal.company }}</div>
                            
                            <div class="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-700">
                                <div class="flex -space-x-2">
                                     <div v-if="deal.avatar" class="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-gray-200 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                                        <img :src="deal.avatar" class="w-full h-full object-cover">
                                     </div>
                                     <div v-else class="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                                        {{ deal.ownerInitials }}
                                     </div>
                                </div>
                                <span class="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                                    ${{ deal.value.toLocaleString() }}
                                </span>
                            </div>
                         </div>
                    </div>
                </div>
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

const { stages, moveDeal } = useDeals();

// Drag and Drop Logic
const draggedDeal = ref<{ deal: Deal; sourceStageId: string } | null>(null);

const onDragStart = (event: DragEvent, deal: Deal, stageId: string) => {
    draggedDeal.value = { deal, sourceStageId: stageId };
    
    // Set drag effect
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.dropEffect = 'move';
    }
};

const onDrop = (event: DragEvent, targetStageId: string) => {
    if (!draggedDeal.value) return;

    const { deal, sourceStageId } = draggedDeal.value;

    moveDeal(deal, sourceStageId, targetStageId);

    // Reset
    draggedDeal.value = null;
};
</script>
