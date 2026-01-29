<template>
    <div class="max-w-4xl mx-auto space-y-8">
        <div>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">System Settings</h1>
            <p class="text-slate-500 text-sm">Manage your account preferences and system data.</p>
        </div>

        <!-- Appearance Section -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-here-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div class="p-6 border-b border-here-gray-100 dark:border-slate-700">
                 <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">Appearance</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400">Customize how HereCRM looks on your device.</p>
            </div>
            <div class="p-6 flex items-center justify-between">
                <div>
                     <div class="font-medium text-slate-900 dark:text-white">Dark Mode</div>
                     <div class="text-sm text-slate-500 dark:text-slate-400">Reduce eye strain with a dark interface.</div>
                </div>
                <!-- Toggle Switch -->
                 <button 
                    @click="toggleDark()" 
                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-here-purple-500 focus:ring-offset-2"
                    :class="isDark ? 'bg-here-purple-600' : 'bg-slate-200'"
                >
                    <span 
                        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                        :class="isDark ? 'translate-x-6' : 'translate-x-1'"
                    />
                </button>
            </div>
        </div>

        <!-- Profile Section -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-here-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div class="p-6 border-b border-here-gray-100 dark:border-slate-700">
                <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">Profile Information</h3>
                <p class="text-sm text-slate-500 dark:text-slate-400">Update your account's profile information and email address.</p>
            </div>
            <div class="p-6 space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-1">
                        <label class="text-sm font-medium text-slate-700 dark:text-slate-300">Display Name</label>
                        <input type="text" value="Ilya Zaigralov" class="w-full px-3 py-2 rounded-lg border border-here-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-here-purple-500 focus:border-transparent outline-none text-slate-900" />
                    </div>
                    <div class="space-y-1">
                        <label class="text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                        <input type="text" value="Partner" disabled class="w-full px-3 py-2 rounded-lg border border-here-gray-200 dark:border-slate-600 bg-here-gray-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed" />
                    </div>
                </div>
                 <div class="space-y-1">
                    <label class="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                    <input type="email" value="ilya@example.com" class="w-full px-3 py-2 rounded-lg border border-here-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-here-purple-500 focus:border-transparent outline-none text-slate-900" />
                </div>
            </div>
            <div class="px-6 py-4 bg-here-gray-50 dark:bg-slate-900/50 flex justify-end">
                <button class="px-4 py-2 bg-here-purple-600 text-white rounded-lg font-medium hover:bg-here-purple-700 transition-colors shadow-sm">
                    Save Changes
                </button>
            </div>
        </div>

        <!-- Data Management -->
        <div class="bg-white rounded-xl border border-here-gray-200 shadow-sm overflow-hidden">
             <div class="p-6 border-b border-here-gray-100">
                <h3 class="text-lg font-bold text-slate-900 mb-1">Data Management</h3>
                <p class="text-sm text-slate-500">Wait! These actions are irreversible.</p>
            </div>
            <div class="p-6 space-y-4">
                <div class="flex items-center justify-between p-4 rounded-lg border border-orange-100 bg-orange-50">
                    <div>
                        <h4 class="font-bold text-orange-800">Clear Saved Reports</h4>
                        <p class="text-sm text-orange-600">Remove all {{ savedReports.length }} saved analysis reports.</p>
                    </div>
                    <button @click="clearReports" :disabled="!savedReports.length" class="px-3 py-1.5 bg-white border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium disabled:opacity-50">
                        Clear Reports
                    </button>
                </div>
                <div class="flex items-center justify-between p-4 rounded-lg border border-red-100 bg-red-50">
                     <div>
                        <h4 class="font-bold text-red-800">Factory Reset</h4>
                        <p class="text-sm text-red-600">Delete all datasets, reports, and reset settings.</p>
                    </div>
                     <button @click="factoryReset" class="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium">
                        Reset System
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useDataAnalysis } from '~/composables/useDataAnalysis';
import { useTheme } from '~/composables/useTheme';

const { savedReports, savedDatasets } = useDataAnalysis();
const { isDark, toggleDark } = useTheme();

const clearReports = () => {
    if (confirm('Are you sure you want to delete all reports?')) {
        savedReports.value = [];
        alert('Reports cleared.');
    }
};

const factoryReset = () => {
    if (confirm('DANGER: This will delete ALL data. Continue?')) {
        savedReports.value = [];
        savedDatasets.value = [];
        localStorage.clear();
        alert('System reset complete. Refreshing...');
        window.location.reload();
    }
};
</script>
