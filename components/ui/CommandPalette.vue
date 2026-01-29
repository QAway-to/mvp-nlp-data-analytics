<template>
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" @click="close"></div>
        
        <!-- Palette Window -->
        <div class="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden relative border border-slate-200 dark:border-slate-700 animate-scale-in flex flex-col max-h-[60vh]">
            <!-- Search Input -->
            <div class="flex items-center p-4 border-b border-slate-100 dark:border-slate-700">
                <i class="pi pi-search text-slate-400 text-lg mr-3"></i>
                <input 
                    ref="searchInput"
                    v-model="query"
                    type="text" 
                    placeholder="Search deals, clients, or type a command..." 
                    class="w-full bg-transparent text-lg text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none"
                    @keydown.esc="close"
                />
                <div class="flex gap-2">
                    <span class="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">ESC</span>
                </div>
            </div>

            <!-- Results -->
            <div class="flex-1 overflow-y-auto custom-scrollbar p-2">
                <div v-if="filteredResults.length === 0 && query" class="p-8 text-center text-slate-500">
                     No results found for "{{ query }}"
                </div>

                <!-- Grouped Results -->
                <div v-else class="space-y-4">
                    <!-- Navigation Group -->
                    <div v-if="groupedResults.navigation.length > 0">
                        <h4 class="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Navigation & Actions</h4>
                        <div class="space-y-1">
                            <button v-for="item in groupedResults.navigation" :key="item.id" 
                                class="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
                                @click="handleSelect(item)"
                            >
                                <div class="w-8 h-8 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-600">
                                    <i :class="item.icon"></i>
                                </div>
                                <div>
                                    <div class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ item.title }}</div>
                                    <div class="text-xs text-slate-500">{{ item.subtitle }}</div>
                                </div>
                                <i class="pi pi-arrow-right ml-auto text-slate-400 opacity-0 group-hover:opacity-100 text-xs"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Deals Group -->
                    <div v-if="groupedResults.deals.length > 0">
                        <h4 class="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 mt-2">Deals</h4>
                        <div class="space-y-1">
                             <button v-for="item in groupedResults.deals" :key="item.id" 
                                class="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
                                @click="handleSelect(item)"
                            >
                                <div class="w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                                    <span class="text-xs font-bold">$</span>
                                </div>
                                <div>
                                    <div class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ item.title }}</div>
                                    <div class="text-xs text-slate-500">{{ item.subtitle }}</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
             <div class="p-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center text-[10px] text-slate-400 px-4">
                <div class="flex gap-3">
                    <span><strong class="text-slate-500 bg-slate-200 dark:bg-slate-700 px-1 rounded">↑↓</strong> to navigate</span>
                    <span><strong class="text-slate-500 bg-slate-200 dark:bg-slate-700 px-1 rounded">↵</strong> to select</span>
                </div>
                <div>Pro Tip: Type ">" for commands</div>
             </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps<{
    isOpen: boolean
}>();

const emit = defineEmits(['close']);
const router = useRouter();
const query = ref('');
const searchInput = ref<HTMLInputElement | null>(null);

// Focus input when opened
watch(() => props.isOpen, async (val) => {
    if (val) {
        query.value = '';
        await nextTick();
        searchInput.value?.focus();
    }
});

const close = () => emit('close');

// Mock Data Source
const navigationItems = [
    { id: 'nav-1', title: 'Dashboard', subtitle: 'Go to main dashboard', icon: 'pi pi-chart-bar', type: 'nav', path: '/' },
    { id: 'nav-2', title: 'Deals Pipeline', subtitle: 'Manage deals and stages', icon: 'pi pi-th-large', type: 'nav', path: '/deals' },
    { id: 'nav-3', title: 'Reports', subtitle: 'View analytics reports', icon: 'pi pi-chart-line', type: 'nav', path: '/reports' },
    { id: 'nav-4', title: 'Clients', subtitle: 'Manage client database', icon: 'pi pi-users', type: 'nav', path: '/clients' },
    { id: 'act-1', title: 'Create New Deal', subtitle: 'Action', icon: 'pi pi-plus', type: 'action', action: () => alert('Create Deal Modal would open here') },
];

const mockDeals = [
    { id: 'deal-1', title: 'TechCorp Enterprise License', subtitle: 'TechCorp • $150,000', type: 'deal' },
    { id: 'deal-2', title: 'Acme Logistics Expansion', subtitle: 'Acme Inc • $45,000', type: 'deal' },
    { id: 'deal-3', title: 'Small Business Plan', subtitle: 'StartUp LLC • $4,500', type: 'deal' },
];

const filteredResults = computed(() => {
    const q = query.value.toLowerCase();
    if (!q) return [...navigationItems.slice(0, 3)]; // Default suggestions
    
    return [
        ...navigationItems.filter(i => i.title.toLowerCase().includes(q)),
        ...mockDeals.filter(i => i.title.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q))
    ];
});

const groupedResults = computed(() => {
    return {
        navigation: filteredResults.value.filter(i => i.type === 'nav' || i.type === 'action'),
        deals: filteredResults.value.filter(i => i.type === 'deal'),
    };
});

const handleSelect = (item: any) => {
    if (item.type === 'nav') {
        router.push(item.path);
    } else if (item.type === 'action') {
        item.action();
    } else if (item.type === 'deal') {
        router.push('/deals'); // In real app, go to deal detail
        // simulated:
        setTimeout(() => alert(`Navigating to deal: ${item.title}`), 100);
    }
    close();
};
</script>

<style scoped>
.animate-scale-in {
    animation: scaleIn 0.2s ease-out;
}

@keyframes scaleIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}
</style>
