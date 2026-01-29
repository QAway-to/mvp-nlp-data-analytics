<template>
    <div class="w-full bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-2xl p-2">
        <div class="relative flex items-center gap-2">
            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                 <i class="pi pi-sparkles text-indigo-400" :class="{'animate-pulse': loading}"></i>
            </div>
            <input 
                v-model="query"
                type="text"
                class="w-full bg-transparent border-none focus:ring-0 text-slate-200 placeholder-slate-500 pl-10 pr-12 py-3 text-base"
                placeholder="Ask your data anything (e.g. 'Show sales trend', 'Find anomalies')..."
                @keydown.enter.prevent="onSubmit"
                :disabled="loading"
            />
            <div class="absolute right-2 top-1/2 -translate-y-1/2">
                <Button 
                    icon="pi pi-arrow-up" 
                    rounded 
                    text
                    :loading="loading"
                    @click="onSubmit"
                    :disabled="!query.trim()"
                    class="!text-indigo-400 hover:!bg-indigo-500/10 hover:!text-indigo-300 !w-8 !h-8"
                />
            </div>
        </div>
        <!-- Quick Prompts? Optional -->
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
    loading: boolean;
}>();

const emit = defineEmits(['submit']);
const query = ref('');

const onSubmit = () => {
    if (query.value.trim() && !props.loading) {
        emit('submit', query.value);
        // Optional: clear query or keep it for context? Usually keep for history, clear input for new
        query.value = '';
    }
};
</script>
