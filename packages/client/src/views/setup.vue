<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { resetDbStatus } from '../router/index';
import {
  CircleStackIcon,
  UserPlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/vue/24/outline';

const router = useRouter();
const showDbPassword = ref(false);
const showAdminPassword = ref(false);
const showAdminPasswordConfirm = ref(false);

// Step: 1 = database, 2 = admin account
const step = ref(1);

const STORAGE_KEY = 'futurehub_setup';

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const saved = loadSaved();

// DB form
const dbForm = ref({
  host: saved?.host || '',
  port: saved?.port || 27017,
  username: saved?.username || '',
  password: saved?.password || '',
  database: saved?.database || '',
});

// Admin form
const adminForm = ref({
  name: saved?.adminName || '',
  email: saved?.adminEmail || '',
  password: '',
  passwordConfirm: '',
});

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    host: dbForm.value.host,
    port: dbForm.value.port,
    username: dbForm.value.username,
    password: dbForm.value.password,
    database: dbForm.value.database,
    adminName: adminForm.value.name,
    adminEmail: adminForm.value.email,
  }));
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

const testResult = ref<{ success: boolean; message: string } | null>(null);
const testing = ref(false);
const saving = ref(false);
const error = ref('');

onMounted(async () => {
  try {
    const { data } = await axios.get('/api/setup/status');
    if (data.configured && !data.hasAdmin) {
      step.value = 2;
    } else if (data.configured && data.hasAdmin) {
      router.push('/login');
    }
  } catch {}
});

async function testConnection() {
  testing.value = true;
  testResult.value = null;
  error.value = '';
  try {
    const { data } = await axios.post('/api/setup/test-connection', dbForm.value);
    testResult.value = data;
  } catch (e: any) {
    testResult.value = { success: false, message: e.response?.data?.error || 'Blad testu polaczenia' };
  } finally {
    testing.value = false;
  }
}

async function saveDatabase() {
  saving.value = true;
  error.value = '';
  try {
    const { data } = await axios.post('/api/setup/save', dbForm.value);
    if (data.success) {
      saveToStorage();
      resetDbStatus();
      step.value = 2;
    }
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Blad zapisu konfiguracji';
  } finally {
    saving.value = false;
  }
}

async function createAdmin() {
  if (adminForm.value.password !== adminForm.value.passwordConfirm) {
    error.value = 'Hasla nie sa identyczne';
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    const { data } = await axios.post('/api/setup/create-admin', {
      name: adminForm.value.name,
      email: adminForm.value.email,
      password: adminForm.value.password,
    });
    if (data.success) {
      saveToStorage();
      clearStorage();
      resetDbStatus();
      router.push('/login');
    }
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Blad tworzenia konta';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-900 px-4">
    <div class="w-full max-w-lg">
      <!-- Header -->
      <div class="text-center mb-8">
        <component
          :is="step === 1 ? CircleStackIcon : UserPlusIcon"
          class="mx-auto h-16 w-16 text-primary-400"
        />
        <h1 class="mt-4 text-3xl font-bold text-white">FutureHub — Konfiguracja</h1>
        <p class="mt-2 text-gray-400">
          {{ step === 1 ? 'Krok 1/2 — Polaczenie z baza danych' : 'Krok 2/2 — Konto administratora' }}
        </p>
      </div>

      <!-- Step indicators -->
      <div class="mb-6 flex items-center justify-center gap-3">
        <div :class="['flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold', step >= 1 ? 'bg-primary-500 text-white' : 'bg-gray-700 text-gray-400']">1</div>
        <div class="h-0.5 w-12 bg-gray-700">
          <div :class="['h-full bg-primary-500 transition-all', step >= 2 ? 'w-full' : 'w-0']" />
        </div>
        <div :class="['flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold', step >= 2 ? 'bg-primary-500 text-white' : 'bg-gray-700 text-gray-400']">2</div>
      </div>

      <div class="rounded-lg bg-white p-8 shadow-xl">
        <div v-if="error" class="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{{ error }}</div>

        <!-- STEP 1: Database -->
        <template v-if="step === 1">
          <!-- Test result -->
          <div
            v-if="testResult"
            :class="[
              testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200',
              'mb-4 flex items-center gap-3 rounded-md border p-3',
            ]"
          >
            <CheckCircleIcon v-if="testResult.success" class="h-5 w-5 text-green-600 flex-shrink-0" />
            <XCircleIcon v-else class="h-5 w-5 text-red-600 flex-shrink-0" />
            <span :class="testResult.success ? 'text-green-700' : 'text-red-700'" class="text-sm">
              {{ testResult.message }}
            </span>
          </div>

          <form @submit.prevent="saveDatabase" class="space-y-4">
            <div class="grid grid-cols-3 gap-3">
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700">Host</label>
                <input
                  v-model="dbForm.host"
                  required
                  placeholder="np. mongo3.small.pl"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Port</label>
                <input
                  v-model.number="dbForm.port"
                  type="number"
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Nazwa bazy danych</label>
              <input
                v-model="dbForm.database"
                required
                placeholder="np. mo1315_futureHub"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Uzytkownik <span class="text-gray-400">(opcjonalnie)</span></label>
              <input
                v-model="dbForm.username"
                placeholder="np. mo1315_futureHub"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Haslo <span class="text-gray-400">(opcjonalnie)</span></label>
              <div class="relative mt-1">
                <input
                  v-model="dbForm.password"
                  :type="showDbPassword ? 'text' : 'password'"
                  class="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button type="button" @click="showDbPassword = !showDbPassword" class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                  <component :is="showDbPassword ? EyeSlashIcon : EyeIcon" class="h-4 w-4" />
                </button>
              </div>
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="testConnection"
                :disabled="testing || !dbForm.host || !dbForm.database"
                class="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <ArrowPathIcon :class="['h-4 w-4', testing && 'animate-spin']" />
                {{ testing ? 'Testowanie...' : 'Testuj polaczenie' }}
              </button>
              <button
                type="submit"
                :disabled="saving || !dbForm.host || !dbForm.database"
                class="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
              >
                {{ saving ? 'Zapisywanie...' : 'Dalej' }}
                <ArrowRightIcon class="h-4 w-4" />
              </button>
            </div>
          </form>
        </template>

        <!-- STEP 2: Admin account -->
        <template v-if="step === 2">
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-gray-900">Utworz konto administratora</h2>
            <p class="mt-1 text-sm text-gray-500">To konto posluzy do logowania w panelu FutureHub</p>
          </div>

          <form @submit.prevent="createAdmin" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Imie i nazwisko</label>
              <input
                v-model="adminForm.name"
                required
                placeholder="np. Dawid Polak"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Adres e-mail</label>
              <input
                v-model="adminForm.email"
                type="email"
                required
                placeholder="np. admin@futurehub.pl"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Haslo</label>
              <div class="relative mt-1">
                <input
                  v-model="adminForm.password"
                  :type="showAdminPassword ? 'text' : 'password'"
                  required
                  minlength="6"
                  class="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button type="button" @click="showAdminPassword = !showAdminPassword" class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                  <component :is="showAdminPassword ? EyeSlashIcon : EyeIcon" class="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Powtorz haslo</label>
              <div class="relative mt-1">
                <input
                  v-model="adminForm.passwordConfirm"
                  :type="showAdminPasswordConfirm ? 'text' : 'password'"
                  required
                  minlength="6"
                  class="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button type="button" @click="showAdminPasswordConfirm = !showAdminPasswordConfirm" class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                  <component :is="showAdminPasswordConfirm ? EyeSlashIcon : EyeIcon" class="h-4 w-4" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              :disabled="saving || !adminForm.name || !adminForm.email || !adminForm.password || !adminForm.passwordConfirm"
              class="w-full rounded-md bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {{ saving ? 'Tworzenie konta...' : 'Utworz konto i przejdz do logowania' }}
            </button>
          </form>
        </template>
      </div>

      <p class="mt-4 text-center text-xs text-gray-500">
        {{ step === 1 ? 'Dane polaczenia zostana zapisane w pliku .env na serwerze' : 'Po utworzeniu konta zostaniesz przekierowany do logowania' }}
      </p>
    </div>
  </div>
</template>
