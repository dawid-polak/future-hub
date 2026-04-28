<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fh } from '../api/bridge';

const router = useRouter();
const settings = ref<{ apiBase: string; companyName: string; syncIntervalMinutes: number; autoStart: boolean } | null>(
  null
);
const saving = ref(false);
const saved = ref(false);

onMounted(async () => {
  settings.value = await fh.settings.get();
});

async function save() {
  if (!settings.value) return;
  saving.value = true;
  await fh.settings.set({
    syncIntervalMinutes: settings.value.syncIntervalMinutes,
    autoStart: settings.value.autoStart,
    apiBase: settings.value.apiBase,
  });
  saving.value = false;
  saved.value = true;
  setTimeout(() => (saved.value = false), 2000);
}
</script>

<template>
  <div class="flex-1 flex flex-col">
    <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h1 class="text-lg font-bold text-gray-900">Ustawienia</h1>
      <button @click="router.back()" class="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded hover:bg-gray-100">
        ← Wróć
      </button>
    </header>

    <main class="flex-1 overflow-y-auto p-6 space-y-4" v-if="settings">
      <div class="bg-white shadow rounded-lg p-5">
        <label class="block text-sm font-medium text-gray-700 mb-2">URL serwera API</label>
        <input
          v-model="settings.apiBase"
          type="url"
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
        />
        <p class="text-xs text-gray-500 mt-1">Zmiana wymaga ponownego logowania.</p>
      </div>

      <div class="bg-white shadow rounded-lg p-5">
        <label class="block text-sm font-medium text-gray-700 mb-2">Interwał synchronizacji</label>
        <select
          v-model.number="settings.syncIntervalMinutes"
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
        >
          <option :value="5">Co 5 minut</option>
          <option :value="10">Co 10 minut</option>
          <option :value="15">Co 15 minut</option>
          <option :value="30">Co 30 minut</option>
          <option :value="60">Co 60 minut</option>
        </select>
      </div>

      <div class="bg-white shadow rounded-lg p-5 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-700">Uruchamiaj przy starcie systemu</p>
          <p class="text-xs text-gray-500 mt-0.5">Aplikacja będzie ukryta w pasku</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input v-model="settings.autoStart" type="checkbox" class="sr-only peer" />
          <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5"></div>
        </label>
      </div>

      <div class="flex justify-end gap-3">
        <button
          @click="save"
          :disabled="saving"
          class="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-medium px-5 py-2 rounded-lg"
        >
          {{ saving ? 'Zapisuję...' : saved ? 'Zapisano ✓' : 'Zapisz' }}
        </button>
      </div>
    </main>
  </div>
</template>
