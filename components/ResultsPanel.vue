<template>
    <div v-if="result" class="space-y-6 animate-fade-in">
        <!-- Message -->
        <div class="p-6 rounded-xl bg-gradient-to-br from-here-purple-50 to-white border border-here-purple-100 shadow-sm">
            <h3 class="text-lg font-bold text-here-purple-700 mb-2 flex items-center gap-2">
                <i class="pi pi-sparkles"></i> AI Analysis
            </h3>
            <p class="text-slate-700 leading-relaxed whitespace-pre-wrap">{{ result.message }}</p>
        </div>

        <!-- Insights -->
        <div v-if="result.insights?.length" class="grid gap-4 md:grid-cols-2">
            <div v-for="(insight, idx) in result.insights" :key="idx" 
                class="p-4 rounded-xl border bg-white shadow-sm"
                :class="{
                    'border-orange-100 bg-orange-50/50': insight.type === 'anomaly',
                    'border-here-purple-100 bg-here-purple-50/50': insight.type === 'pattern',
                    'border-emerald-100 bg-emerald-50/50': insight.type === 'trend',
                    'border-blue-100 bg-blue-50/50': insight.type === 'recommendation'
                }"
            >
                <div class="font-bold mb-1 flex items-center gap-2" :class="{
                    'text-orange-600': insight.type === 'anomaly',
                    'text-here-purple-600': insight.type === 'pattern',
                    'text-emerald-600': insight.type === 'trend',
                    'text-blue-600': insight.type === 'recommendation'
                }">
                    <i class="pi" :class="{
                        'pi-exclamation-circle': insight.type === 'anomaly',
                        'pi-objects-column': insight.type === 'pattern',
                        'pi-chart-line': insight.type === 'trend',
                        'pi-lightbulb': insight.type === 'recommendation'
                    }"></i>
                    {{ insight.title }}
                </div>
                <div class="text-sm text-slate-600">{{ insight.description }}</div>
            </div>
        </div>

        <!-- Chart -->
        <div v-if="result.chart" class="p-6 rounded-xl bg-white border border-here-gray-200 shadow-sm">
            <h3 class="text-lg font-bold text-slate-800 mb-6">Visualization</h3>
            <div class="h-[400px] w-full relative">
                <Chart type="bar" :data="chartData" :options="chartOptions" class="h-full w-full" />
            </div>
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
    return {
        labels: c.data.map((d: any) => d[c.xKey]),
        datasets: [{
            label: c.yKey,
            data: c.data.map((d: any) => d[c.yKey]),
            backgroundColor: 'rgba(124, 58, 237, 0.6)', // here-purple-600
            borderColor: '#7c3aed',
            borderWidth: 1,
            borderRadius: 4
        }]
    };
});

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: { color: '#64748b' } // slate-500
        }
    },
    scales: {
        x: {
            ticks: { color: '#64748b' },
            grid: { color: '#e2e8f0' } // slate-200
        },
        y: {
            ticks: { color: '#64748b' },
            grid: { color: '#e2e8f0' }
        }
    }
};
</script>
