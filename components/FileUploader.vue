<template>
    <div class="card flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors">
        <FileUpload 
            mode="basic" 
            name="demo[]" 
            accept=".csv,.xlsx,.xls" 
            :maxFileSize="10000000" 
            @select="onSelect"
            :auto="true"
            chooseLabel="Загрузить CSV/Excel" 
            class="p-button-outlined"
        />
        <p class="mt-4 text-sm text-slate-400">
            Поддерживаются файлы .csv и .xlsx до 10MB
        </p>
    </div>
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast';

const emit = defineEmits(['file-uploaded']);
const toast = useToast();

const onSelect = async (event: any) => {
    const file = event.files[0];
    if (file) {
        emit('file-uploaded', file);
    }
};
</script>
