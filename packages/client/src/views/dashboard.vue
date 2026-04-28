<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api/index';
import { useAuthStore } from '../stores/auth';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';
import StatsChart from '../components/statsChart.vue';
import {
  CommandLineIcon,
  UsersIcon,
  ShieldCheckIcon,
  CircleStackIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/vue/24/outline';

const auth = useAuthStore();
const dashboard = ref<any>(null);
const loading = ref(true);

// DB dialog
const showDbDialog = ref(false);
const dbInfo = ref<any>(null);
const dbLoading = ref(false);
const exporting = ref(false);

onMounted(async () => {
  try {
    await auth.fetchMe();
    const { data } = await api.get('/analytics/dashboard');
    dashboard.value = data;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
});

function topSkillsChartData() {
  if (!dashboard.value?.topSkills?.length) return null;
  return {
    labels: dashboard.value.topSkills.map((s: any) => s.name),
    datasets: [{
      label: 'Uzycia',
      data: dashboard.value.topSkills.map((s: any) => s.count),
      backgroundColor: '#3b82f6',
      borderRadius: 6,
    }],
  };
}

async function openDbDialog() {
  showDbDialog.value = true;
  dbLoading.value = true;
  try {
    const { data } = await api.get('/setup/db-info');
    dbInfo.value = data;
  } catch (e: any) {
    dbInfo.value = { connected: false, state: 'blad' };
  } finally {
    dbLoading.value = false;
  }
}

async function refreshDbInfo() {
  dbLoading.value = true;
  try {
    const { data } = await api.get('/setup/db-info');
    dbInfo.value = data;
  } catch {
    dbInfo.value = { connected: false, state: 'blad' };
  } finally {
    dbLoading.value = false;
  }
}

async function exportDatabase() {
  exporting.value = true;
  try {
    const { data } = await api.get('/setup/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `futurehub-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e: any) {
    alert(e.response?.data?.error || 'Blad eksportu');
  } finally {
    exporting.value = false;
  }
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds: number): string {
  if (!seconds) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p class="mt-1 text-sm text-gray-500">Witaj, {{ auth.user?.name }}</p>
      </div>
      <button
        @click="openDbDialog"
        class="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <CircleStackIcon class="h-4 w-4" />
        Baza danych
      </button>
    </div>

    <div v-if="loading" class="mt-8 text-center text-gray-400">Ladowanie...</div>

    <template v-else-if="dashboard">
      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="rounded-lg bg-white p-5 shadow">
          <div class="flex items-center">
            <CommandLineIcon class="h-8 w-8 text-primary-500" />
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Skille</p>
              <p class="text-2xl font-bold text-gray-900">{{ dashboard.totalSkills }}</p>
            </div>
          </div>
        </div>
        <div class="rounded-lg bg-white p-5 shadow">
          <div class="flex items-center">
            <UsersIcon class="h-8 w-8 text-green-500" />
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Uzytkownicy</p>
              <p class="text-2xl font-bold text-gray-900">{{ dashboard.totalUsers }}</p>
            </div>
          </div>
        </div>
        <div class="rounded-lg bg-white p-5 shadow">
          <div class="flex items-center">
            <ShieldCheckIcon class="h-8 w-8 text-purple-500" />
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Role</p>
              <p class="text-2xl font-bold text-gray-900">{{ dashboard.totalRoles }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="rounded-lg bg-white p-6 shadow">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Top uzywane skille</h3>
          <StatsChart v-if="topSkillsChartData()" type="bar" :data="topSkillsChartData()!" :options="{ responsive: true, plugins: { legend: { display: false } } }" />
          <p v-else class="text-sm text-gray-400">Brak danych</p>
        </div>
        <div class="rounded-lg bg-white p-6 shadow">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Ostatnia aktywnosc</h3>
          <ul v-if="dashboard.recentLogs?.length" class="space-y-3">
            <li v-for="log in dashboard.recentLogs" :key="log._id" class="flex items-center justify-between text-sm">
              <span class="text-gray-700">{{ log.userId?.name || 'Nieznany' }} — {{ log.skillId?.name || log.action }}</span>
              <span class="text-gray-400">{{ new Date(log.timestamp).toLocaleString('pl-PL') }}</span>
            </li>
          </ul>
          <p v-else class="text-sm text-gray-400">Brak aktywnosci</p>
        </div>
      </div>
    </template>

    <!-- Database dialog -->
    <Dialog :open="showDbDialog" @close="showDbDialog = false" class="relative z-50">
      <div class="fixed inset-0 bg-black/30" />
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel class="mx-auto w-full max-w-lg rounded-lg bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <DialogTitle class="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <CircleStackIcon class="h-5 w-5 text-primary-500" />
              Baza danych
            </DialogTitle>
            <button @click="refreshDbInfo" :disabled="dbLoading" class="text-gray-400 hover:text-gray-600">
              <ArrowPathIcon :class="['h-5 w-5', dbLoading && 'animate-spin']" />
            </button>
          </div>

          <div class="px-6 py-4">
            <div v-if="dbLoading" class="py-8 text-center text-gray-400">Ladowanie informacji...</div>

            <template v-else-if="dbInfo">
              <div :class="[dbInfo.connected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200', 'flex items-center gap-3 rounded-md border p-3 mb-4']">
                <CheckCircleIcon v-if="dbInfo.connected" class="h-5 w-5 text-green-600" />
                <XCircleIcon v-else class="h-5 w-5 text-red-600" />
                <span :class="dbInfo.connected ? 'text-green-700' : 'text-red-700'" class="text-sm font-medium">
                  {{ dbInfo.connected ? 'Polaczenie aktywne' : 'Brak polaczenia' }}
                </span>
              </div>

              <div v-if="dbInfo.connected" class="space-y-3">
                <table class="w-full text-sm">
                  <tbody class="divide-y divide-gray-100">
                    <tr><td class="py-2 pr-4 font-medium text-gray-500">Host</td><td class="py-2 font-mono text-gray-900">{{ dbInfo.host }}:{{ dbInfo.port }}</td></tr>
                    <tr><td class="py-2 pr-4 font-medium text-gray-500">Baza</td><td class="py-2 font-mono text-gray-900">{{ dbInfo.name }}</td></tr>
                    <tr v-if="dbInfo.serverVersion"><td class="py-2 pr-4 font-medium text-gray-500">Wersja MongoDB</td><td class="py-2 text-gray-900">{{ dbInfo.serverVersion }}</td></tr>
                    <tr v-if="dbInfo.uptime"><td class="py-2 pr-4 font-medium text-gray-500">Uptime serwera</td><td class="py-2 text-gray-900">{{ formatUptime(dbInfo.uptime) }}</td></tr>
                    <tr v-if="dbInfo.collections"><td class="py-2 pr-4 font-medium text-gray-500">Kolekcje</td><td class="py-2 text-gray-900">{{ dbInfo.collections }}</td></tr>
                    <tr v-if="dbInfo.documents"><td class="py-2 pr-4 font-medium text-gray-500">Dokumenty</td><td class="py-2 text-gray-900">{{ dbInfo.documents.toLocaleString('pl-PL') }}</td></tr>
                    <tr v-if="dbInfo.dataSize"><td class="py-2 pr-4 font-medium text-gray-500">Rozmiar danych</td><td class="py-2 text-gray-900">{{ formatBytes(dbInfo.dataSize) }}</td></tr>
                    <tr v-if="dbInfo.storageSize"><td class="py-2 pr-4 font-medium text-gray-500">Rozmiar storage</td><td class="py-2 text-gray-900">{{ formatBytes(dbInfo.storageSize) }}</td></tr>
                  </tbody>
                </table>
              </div>
            </template>
          </div>

          <div class="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <button @click="exportDatabase" :disabled="exporting || !dbInfo?.connected" class="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
              <ArrowDownTrayIcon class="h-4 w-4" />
              {{ exporting ? 'Eksportowanie...' : 'Eksportuj do JSON' }}
            </button>
            <button @click="showDbDialog = false" class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Zamknij</button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  </div>
</template>
