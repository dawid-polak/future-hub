<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../api/index';
import StatsChart from '../../components/statsChart.vue';

const dashboard = ref<any>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    const { data } = await api.get('/analytics/dashboard');
    dashboard.value = data;
  } finally {
    loading.value = false;
  }
});

function topSkillsChart() {
  if (!dashboard.value?.topSkills?.length) return null;
  return {
    labels: dashboard.value.topSkills.map((s: any) => s.name),
    datasets: [{
      label: 'Liczba uzyc',
      data: dashboard.value.topSkills.map((s: any) => s.count),
      backgroundColor: [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
      ],
      borderRadius: 6,
    }],
  };
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900">Analityka</h1>

    <div v-if="loading" class="mt-8 text-center text-gray-400">Ladowanie danych...</div>

    <template v-else-if="dashboard">
      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="rounded-lg bg-white p-6 shadow">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Top uzywane skille</h3>
          <StatsChart v-if="topSkillsChart()" type="bar" :data="topSkillsChart()!" :options="{ responsive: true, indexAxis: 'y', plugins: { legend: { display: false } } }" />
          <p v-else class="text-sm text-gray-400">Brak danych o uzyciu skilli</p>
        </div>

        <div class="rounded-lg bg-white p-6 shadow">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Ostatnia aktywnosc</h3>
          <ul v-if="dashboard.recentLogs?.length" class="space-y-3">
            <li v-for="log in dashboard.recentLogs" :key="log._id" class="flex items-center justify-between border-b border-gray-100 pb-2 text-sm">
              <div>
                <span class="font-medium text-gray-700">{{ log.userId?.name || 'Nieznany' }}</span>
                <span class="text-gray-400"> — {{ log.action }} </span>
                <span class="text-primary-600">{{ log.skillId?.name || '' }}</span>
              </div>
              <span class="text-xs text-gray-400">{{ new Date(log.timestamp).toLocaleString('pl-PL') }}</span>
            </li>
          </ul>
          <p v-else class="text-sm text-gray-400">Brak aktywnosci</p>
        </div>
      </div>

      <div class="mt-6 rounded-lg bg-white p-6 shadow">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Podsumowanie</h3>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <p class="text-3xl font-bold text-primary-600">{{ dashboard.totalSkills }}</p>
            <p class="text-sm text-gray-500">Aktywnych skilli</p>
          </div>
          <div>
            <p class="text-3xl font-bold text-green-600">{{ dashboard.totalUsers }}</p>
            <p class="text-sm text-gray-500">Aktywnych uzytkownikow</p>
          </div>
          <div>
            <p class="text-3xl font-bold text-purple-600">{{ dashboard.totalRoles }}</p>
            <p class="text-sm text-gray-500">Zdefiniowanych rol</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
