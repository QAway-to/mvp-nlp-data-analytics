<template>
    <div class="w-full bg-white dark:bg-slate-800 rounded-2xl border border-here-gray-200 dark:border-slate-700 shadow-lg shadow-slate-200/50 dark:shadow-black/20 p-2">
        <div class="relative flex items-center gap-2">
            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                 <i class="pi pi-sparkles text-here-purple-500" :class="{'animate-pulse': loading}"></i>
            </div>
            <input 
                v-model="query"
                type="text"
                class="w-full bg-transparent border-none focus:ring-0 text-slate-800 dark:text-slate-200 placeholder-slate-400 pl-10 pr-12 py-3 text-base"
                placeholder="Ask AI your data questions..."
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
                    class="!text-white !bg-here-purple-600 hover:!bg-here-purple-700 !w-9 !h-9 shadow-md shadow-here-purple-500/30"
                />
            </div>
        </div>
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
        query.value = '';
    }
};
</script>
