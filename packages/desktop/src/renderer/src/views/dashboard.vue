<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { fh } from '../api/bridge';
import type { AppInfo, SyncProgress, AuthStatus } from '../../../shared/types.js';

const router = useRouter();
const info = ref<AppInfo | null>(null);
const auth = ref<AuthStatus | null>(null);
const sync = ref<SyncProgress | null>(null);
let unsubscribe: (() => void) | null = null;

async function refresh() {
  info.value = await fh.system.info();
  auth.value = await fh.auth.status();
  sync.value = await fh.sync.status();
}

const lastSyncRelative = computed(() => {
  if (!sync.value?.lastSyncAt) return 'Nie zsynchronizowano';
  const diff = Date.now() - sync.value.lastSyncAt;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Przed chwilą';
  if (m < 60) return `${m} min temu`;
  const h = Math.floor(m / 60);
  return `${h} godz. temu`;
});

const stateBadge = computed(() => {
  switch (sync.value?.state) {
    case 'running':
      return { label: 'Trwa sync...', class: 'bg-blue-100 text-blue-800' };
    case 'success':
      return { label: 'OK', class: 'bg-green-100 text-green-800' };
    case 'error':
      return { label: 'Błąd', class: 'bg-red-100 text-red-800' };
    default:
      return { label: 'Bezczynny', class: 'bg-gray-100 text-gray-700' };
  }
});

async function syncNow() {
  await fh.sync.run();
  await refresh();
}

async function openWorkdir() {
  await fh.system.openWorkdir();
}

async function logout() {
  if (!confirm('Wylogowanie usunie lokalny katalog skili. Kontynuować?')) return;
  await fh.auth.logout();
  void router.push('/login');
}

onMounted(async () => {
  await refresh();
  unsubscribe = fh.sync.onProgress((p) => {
    sync.value = p;
    if (p.state === 'success') {
      void refresh();
    }
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});
</script>

<template>
  <div class="flex-1 flex flex-col">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-bold text-gray-900">Future Hub</h1>
        <p class="text-xs text-gray-500" v-if="auth?.userName">{{ auth.userName }} ({{ auth.email }})</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="$router.push('/settings')"
          class="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded hover:bg-gray-100"
        >
          Ustawienia
        </button>
        <button
          @click="logout"
          class="text-sm text-red-600 hover:text-red-800 px-3 py-1.5 rounded hover:bg-red-50"
        >
          Wyloguj
        </button>
      </div>
    </header>

    <!-- Body -->
    <main class="flex-1 overflow-y-auto p-6 space-y-4">
      <!-- Status sync -->
      <div class="bg-white shadow rounded-lg p-5">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h2 class="text-sm font-semibold text-gray-700">Status synchronizacji</h2>
            <p class="text-xs text-gray-500 mt-0.5">{{ lastSyncRelative }}</p>
          </div>
          <span :class="['px-2.5 py-1 text-xs font-medium rounded-full', stateBadge.class]">
            {{ stateBadge.label }}
          </span>
        </div>
        <p class="text-sm text-gray-600">{{ sync?.message || 'Brak informacji' }}</p>
        <p v-if="sync?.error" class="text-xs text-red-600 mt-1">{{ sync.error }}</p>
      </div>

      <!-- Info cards -->
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white shadow rounded-lg p-5">
          <p class="text-xs text-gray-500 uppercase tracking-wider">Skille</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{{ info?.skillsCount ?? 0 }}</p>
        </div>
        <div class="bg-white shadow rounded-lg p-5">
          <p class="text-xs text-gray-500 uppercase tracking-wider">Firma</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{{ info?.companyName }}</p>
        </div>
      </div>

      <!-- Workdir -->
      <div class="bg-white shadow rounded-lg p-5">
        <p class="text-xs text-gray-500 uppercase tracking-wider mb-2">Katalog roboczy</p>
        <p class="text-sm font-mono text-gray-800 break-all">{{ info?.workdir }}</p>
        <button
          @click="openWorkdir"
          class="mt-3 text-sm text-primary-600 hover:text-primary-800"
        >
          → Otwórz folder
        </button>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button
          @click="syncNow"
          :disabled="sync?.state === 'running'"
          class="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {{ sync?.state === 'running' ? 'Synchronizuję...' : 'Synchronizuj teraz' }}
        </button>
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-gray-50 border-t border-gray-200 px-6 py-2 text-xs text-gray-500 flex justify-between">
      <span>Future Hub Desktop v{{ info?.appVersion }}</span>
      <span>{{ info?.apiBase }}</span>
    </footer>
  </div>
</template>
