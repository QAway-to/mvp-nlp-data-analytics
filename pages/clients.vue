<template>
    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Clients</h1>
                <p class="text-slate-500 dark:text-slate-400 mt-1">Manage your client base</p>
            </div>
            <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                <i class="pi pi-plus"></i> Add Client
            </button>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <table class="w-full text-left text-sm">
                <thead>
                    <tr class="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                        <th class="px-6 py-4 font-semibold">Name</th>
                        <th class="px-6 py-4 font-semibold">Email</th>
                        <th class="px-6 py-4 font-semibold">Phone</th>
                        <th class="px-6 py-4 font-semibold">Company</th>
                        <th class="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
                    <tr v-for="client in clients" :key="client.id" class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                                    {{ client.name.charAt(0) }}
                                </div>
                                <span class="font-medium text-slate-900 dark:text-white">{{ client.name }}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-slate-600 dark:text-slate-400">{{ client.email }}</td>
                        <td class="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">{{ client.phone }}</td>
                        <td class="px-6 py-4">
                            <span v-if="client.company" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                                <i class="pi pi-building text-[10px]"></i> {{ client.company }}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <button class="text-slate-400 hover:text-blue-600 p-2"><i class="pi pi-pencil"></i></button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const clients = ref([
    { id: 1, name: 'John Doe', email: 'john@example.com', phone: '+1 555-123-4567', company: 'Acme Corp' },
    { id: 2, name: 'Sarah Smith', email: 'sarah@starlight.com', phone: '+1 555-987-6543', company: 'Starlight Inc' },
    { id: 3, name: 'Robert Johnson', email: 'rob@techflow.io', phone: '+1 555-456-7890', company: 'TechFlow' },
    { id: 4, name: 'Emily Davis', email: 'emily@design.co', phone: '+1 555-222-3333', company: 'DesignCo' },
]);
</script>
