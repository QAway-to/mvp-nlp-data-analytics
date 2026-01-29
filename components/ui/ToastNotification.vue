<template>
    <div class="fixed top-20 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        <TransitionGroup name="toast">
            <div v-for="notif in visibleToasts" :key="notif.id" 
                class="w-80 bg-white dark:bg-slate-800 border-l-4 shadow-lg rounded-r-lg p-4 pointer-events-auto flex items-start gap-3 backdrop-blur-xl"
                :class="{
                    'border-blue-500': notif.type === 'info',
                    'border-green-500': notif.type === 'success',
                    'border-amber-500': notif.type === 'warning',
                    'border-red-500': notif.type === 'error',
                }"
            >
                <div class="flex-shrink-0 mt-0.5">
                    <i class="pi" :class="{
                        'pi-info-circle text-blue-500': notif.type === 'info',
                        'pi-check-circle text-green-500': notif.type === 'success',
                        'pi-exclamation-triangle text-amber-500': notif.type === 'warning',
                        'pi-times-circle text-red-500': notif.type === 'error',
                    }"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-1">{{ notif.title }}</h4>
                    <p class="text-xs text-slate-600 dark:text-slate-300">{{ notif.message }}</p>
                </div>
                <button @click="removeToast(notif.id)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <i class="pi pi-times text-xs"></i>
                </button>
            </div>
        </TransitionGroup>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useNotifications, type Notification } from '~/composables/useNotifications';

const { notifications } = useNotifications();
const visibleToasts = ref<Notification[]>([]);

// Watch for new notifications to trigger toast
watch(() => notifications.value.length, (newLen, oldLen) => {
    if (newLen > oldLen) {
        // New notification added (it's unshifted to the start)
        const latest = notifications.value[0];
        showToast(latest);
    }
});

const showToast = (notif: Notification) => {
    visibleToasts.value.unshift(notif);
    setTimeout(() => {
        removeToast(notif.id);
    }, 5000);
};

const removeToast = (id: string) => {
    const idx = visibleToasts.value.findIndex(n => n.id === id);
    if (idx !== -1) {
        visibleToasts.value.splice(idx, 1);
    }
};
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
