<template>
    <div class="w-full">
        <div class="relative">
            <Textarea 
                v-model="query" 
                rows="3" 
                placeholder="Задайте вопрос о ваших данных (например: 'Покажи тренд продаж', 'Найди аномалии')" 
                class="w-full !bg-slate-800 !border-slate-700 !text-slate-100 focus:!border-indigo-500 !resize-none !rounded-xl p-4 pr-16 shadow-lg"
                @keydown.enter.prevent="onSubmit"
                :disabled="loading"
            />
            <Button 
                icon="pi pi-sparkles" 
                class="absolute bottom-3 right-3 !rounded-lg !w-10 !h-10 !p-0" 
                severity="primary"
                :loading="loading"
                @click="onSubmit"
                :disabled="!query.trim()"
            />
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
    }
};
</script>
