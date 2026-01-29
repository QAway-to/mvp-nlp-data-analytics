<template>
    <div v-if="result" class="space-y-6 animate-fade-in">
        <!-- Message -->
        <div class="p-6 rounded-xl bg-gradient-to-br from-here-purple-50 to-white dark:from-slate-800 dark:to-slate-800/50 border border-here-purple-100 dark:border-slate-700 shadow-sm">
            <h3 class="text-lg font-bold text-here-purple-700 dark:text-here-purple-400 mb-2 flex items-center gap-2">
                <i class="pi pi-sparkles"></i> AI Analysis
            </h3>
            <p class="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{{ result.message }}</p>
        </div>

        <!-- Insights -->
        <div v-if="result.insights?.length" class="grid gap-4 md:grid-cols-2">
            <div v-for="(insight, idx) in result.insights" :key="idx" 
                class="p-4 rounded-xl border bg-white dark:bg-slate-800 shadow-sm"
                :class="{
                    'border-orange-100 bg-orange-50/50 dark:bg-orange-900/10 dark:border-orange-900/30': insight.type === 'anomaly',
                    'border-here-purple-100 bg-here-purple-50/50 dark:bg-here-purple-900/10 dark:border-here-purple-900/30': insight.type === 'pattern',
                    'border-emerald-100 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-900/30': insight.type === 'trend',
                    'border-blue-100 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-900/30': insight.type === 'recommendation'
                }"
            >
                <div class="font-bold mb-1 flex items-center gap-2" :class="{
                    'text-orange-600 dark:text-orange-400': insight.type === 'anomaly',
                    'text-here-purple-600 dark:text-here-purple-400': insight.type === 'pattern',
                    'text-emerald-600 dark:text-emerald-400': insight.type === 'trend',
                    'text-blue-600 dark:text-blue-400': insight.type === 'recommendation'
                }">
                    <i class="pi" :class="{
                        'pi-exclamation-circle': insight.type === 'anomaly',
                        'pi-objects-column': insight.type === 'pattern',
                        'pi-chart-line': insight.type === 'trend',
                        'pi-lightbulb': insight.type === 'recommendation'
                    }"></i>
                    {{ insight.title }}
                </div>
                <div class="text-sm text-slate-600 dark:text-slate-400">{{ insight.description }}</div>
            </div>
        </div>

        <!-- Chart -->
        <div v-if="result.chart" class="p-6 rounded-xl bg-white dark:bg-slate-800 border border-here-gray-200 dark:border-slate-700 shadow-sm">
            <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6">Visualization</h3>
            <div class="h-[400px] w-full relative">
                <Chart type="bar" :data="chartData" :options="chartOptions" class="h-full w-full" />
            </div>
        </div>
        
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTheme } from '~/composables/useTheme';

const props = defineProps<{
    result: any;
}>();

const { isDark } = useTheme();

const chartData = computed(() => {
    if (!props.result?.chart) return null;
    
    const c = props.result.chart;
    return {
        labels: c.data.map((d: any) => d[c.xKey]),
        datasets: [{
            label: c.yKey,
            data: c.data.map((d: any) => d[c.yKey]),
            backgroundColor: isDark.value ? 'rgba(124, 58, 237, 0.8)' : 'rgba(124, 58, 237, 0.6)', 
            borderColor: '#7c3aed',
            borderWidth: 1,
            borderRadius: 4
        }]
    };
});

const chartOptions = computed(() => {
    const textColor = isDark.value ? '#94a3b8' : '#64748b'; // slate-400 : slate-500
    const gridColor = isDark.value ? '#334155' : '#e2e8f0'; // slate-700 : slate-200

    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: textColor }
            }
        },
        scales: {
            x: {
                ticks: { color: textColor },
                grid: { color: gridColor }
            },
            y: {
                ticks: { color: textColor },
                grid: { color: gridColor }
            }
        }
    };
});
</script>
