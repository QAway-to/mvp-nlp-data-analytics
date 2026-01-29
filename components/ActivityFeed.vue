<template>
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 h-full flex flex-col">
        <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-slate-800 dark:text-white">Recent Activity</h3>
            <button class="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">View All</button>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <div class="relative pl-4 border-l border-slate-200 dark:border-slate-700 space-y-6">
                <div v-for="item in activities" :key="item.id" class="relative group">
                    <!-- Timeline Dot -->
                    <div class="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ring-1"
                        :class="{
                            'bg-blue-500 ring-blue-100 dark:ring-blue-900': item.type === 'deal_move',
                            'bg-green-500 ring-green-100 dark:ring-green-900': item.type === 'call',
                            'bg-purple-500 ring-purple-100 dark:ring-purple-900': item.type === 'note',
                            'bg-amber-500 ring-amber-100 dark:ring-amber-900': item.type === 'email',
                        }"
                    ></div>

                    <!-- Content -->
                    <div class="flex flex-col gap-1">
                        <div class="flex items-start justify-between">
                            <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <span v-if="item.user" class="text-slate-900 dark:text-white">{{ item.user }}</span>
                                {{ item.action }}
                                <span v-if="item.target" class="font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 cursor-pointer transition-colors">{{ item.target }}</span>
                            </p>
                            <span class="text-[10px] text-slate-400 whitespace-nowrap ml-2">{{ item.time }}</span>
                        </div>
                        <p v-if="item.details" class="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-2 rounded -ml-1 mt-1 border border-slate-100 dark:border-slate-700">
                            {{ item.details }}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const activities = ref([
    {
        id: 1,
        type: 'deal_move',
        user: 'Ilya Zaigralov',
        action: 'moved deal',
        target: 'Acme Corp',
        time: '2 min ago',
        details: 'Stage changed: Qualified -> Negotiation'
    },
    {
        id: 2,
        type: 'call',
        user: 'Sarah Smith',
        action: 'completed call with',
        target: 'John from TechFlow',
        time: '1 hour ago',
        details: 'Discussed Q4 requirements. Positive feedback.'
    },
    {
        id: 3,
        type: 'note',
        user: 'Ilya Zaigralov',
        action: 'added a note to',
        target: 'Global Logistics',
        time: '3 hours ago',
        details: 'Client requested updated pricing for bulk shipment.'
    },
    {
        id: 4,
        type: 'deal_move',
        user: 'System',
        action: 'detected risk in',
        target: 'DesignCo Deal',
        time: '5 hours ago',
        details: 'Sentiment analysis dropped to Negative. Check immediately.'
    },
    {
        id: 5,
        type: 'email',
        user: 'Viktor T.',
        action: 'sent email to',
        target: 'Emily Davis',
        time: 'Yesterday',
        details: 'Re: Contract Draft v2'
    }
]);
</script>
