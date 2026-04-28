<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { fh } from '../api/bridge';

const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

async function submit() {
  if (!email.value || !password.value) {
    error.value = 'Email i hasło są wymagane';
    return;
  }
  loading.value = true;
  error.value = null;
  const res = await fh.auth.login(email.value, password.value);
  loading.value = false;
  if (res.ok) {
    void router.push('/dashboard');
  } else {
    error.value = res.error || 'Logowanie nieudane';
  }
}
</script>

<template>
  <div class="flex-1 flex items-center justify-center bg-gradient-to-br from-primary-50 to-white px-6">
    <div class="w-full max-w-sm bg-white shadow-xl rounded-2xl p-8">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Future Hub</h1>
        <p class="mt-1 text-sm text-gray-500">Zaloguj się aby zsynchronizować skille</p>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            autofocus
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Hasło</label>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div v-if="error" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {{ loading ? 'Loguję...' : 'Zaloguj się' }}
        </button>
      </form>

      <p class="mt-5 text-xs text-gray-400 text-center">
        Twoje dane logowania ustawia administrator firmy.
      </p>
    </div>
  </div>
</template>
