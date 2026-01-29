<template>
    <div v-if="result" class="space-y-6 animate-fade-in">
        <!-- Message -->
        <div class="p-6 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/20">
            <h3 class="text-lg font-semibold text-indigo-300 mb-2 flex items-center gap-2">
                <i class="pi pi-sparkles"></i> AI Analysis
            </h3>
            <p class="text-slate-200 leading-relaxed whitespace-pre-wrap">{{ result.message }}</p>
        </div>

        <!-- Insights -->
        <div v-if="result.insights?.length" class="grid gap-4 md:grid-cols-2">
            <div v-for="(insight, idx) in result.insights" :key="idx" 
                class="p-4 rounded-lg border bg-slate-800/50"
                :class="{
                    'border-amber-500/50 bg-amber-500/5': insight.type === 'anomaly',
                    'border-indigo-500/50 bg-indigo-500/5': insight.type === 'pattern',
                    'border-emerald-500/50 bg-emerald-500/5': insight.type === 'trend',
                    'border-blue-500/50 bg-blue-500/5': insight.type === 'recommendation'
                }"
            >
                <div class="font-medium mb-1" :class="{
                    'text-amber-400': insight.type === 'anomaly',
                    'text-indigo-400': insight.type === 'pattern',
                    'text-emerald-400': insight.type === 'trend',
                    'text-blue-400': insight.type === 'recommendation'
                }">
                    {{ insight.title }}
                </div>
                <div class="text-sm text-slate-400">{{ insight.description }}</div>
            </div>
        </div>

        <!-- Chart -->
        <div v-if="result.chart" class="p-6 rounded-xl bg-slate-800 border border-slate-700">
            <h3 class="text-lg font-semibold text-slate-200 mb-6">Visualization</h3>
            <div class="h-[400px] w-full relative">
                <Chart type="bar" :data="chartData" :options="chartOptions" class="h-full w-full" />
            </div>
        </div>
        
        <!-- Table -->
        <div v-if="result.statistics || result.table" class="p-6 rounded-xl bg-slate-800 border border-slate-700">
             <h3 class="text-lg font-semibold text-slate-200 mb-4">Detailed Data</h3>
             <!-- For MVP just showing stats if available or filtered data -->
        </div>

    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    result: any;
}>();

const chartData = computed(() => {
    if (!props.result?.chart) return null;
    
    const c = props.result.chart;
    // Basic mapping for Chart.js
    return {
        labels: c.data.map((d: any) => d[c.xKey]),
        datasets: [{
            label: c.yKey,
            data: c.data.map((d: any) => d[c.yKey]),
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            borderColor: '#6366f1',
            borderWidth: 1
        }]
    };
});

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: { color: '#94a3b8' }
        }
    },
    scales: {
        x: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(255,255,255,0.05)' }
        }
    }
};
</script>
