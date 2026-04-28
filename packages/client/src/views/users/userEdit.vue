<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUsersStore } from '../../stores/users';
import { useRolesStore } from '../../stores/roles';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';
import { Switch } from '@headlessui/vue';
import { ClipboardDocumentIcon, TrashIcon, KeyIcon } from '@heroicons/vue/24/outline';

const route = useRoute();
const router = useRouter();
const userStore = useUsersStore();
const roleStore = useRolesStore();

const isEdit = computed(() => !!route.params.id);
const loading = ref(false);
const error = ref('');
const newApiKeyName = ref('');
const generatedKey = ref('');
const showKeyDialog = ref(false);

const form = ref({
  name: '',
  email: '',
  password: '',
  isAdmin: false,
  roles: [] as string[],
});

onMounted(async () => {
  await roleStore.fetchRoles();
  if (isEdit.value) {
    await userStore.fetchUser(route.params.id as string);
    await userStore.fetchApiKeys(route.params.id as string);
    if (userStore.currentUser) {
      form.value.name = userStore.currentUser.name;
      form.value.email = userStore.currentUser.email;
      form.value.isAdmin = userStore.currentUser.isAdmin;
      form.value.roles = userStore.currentUser.roles?.map((r: any) => r._id) || [];
    }
  }
});

async function handleSubmit() {
  loading.value = true;
  error.value = '';
  try {
    if (isEdit.value) {
      await userStore.updateUser(route.params.id as string, {
        name: form.value.name,
        email: form.value.email,
        isAdmin: form.value.isAdmin,
        roles: form.value.roles,
      });
    } else {
      await userStore.createUser({
        name: form.value.name,
        email: form.value.email,
        password: form.value.password,
        isAdmin: form.value.isAdmin,
        roles: form.value.roles,
      });
    }
    router.push('/users');
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Blad zapisu';
  } finally {
    loading.value = false;
  }
}

async function handleGenerateKey() {
  if (!newApiKeyName.value) return;
  try {
    const result = await userStore.generateApiKey(route.params.id as string, newApiKeyName.value);
    generatedKey.value = result.raw;
    showKeyDialog.value = true;
    newApiKeyName.value = '';
    await userStore.fetchApiKeys(route.params.id as string);
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Blad generowania klucza';
  }
}

async function handleRevokeKey(keyId: string) {
  await userStore.revokeApiKey(route.params.id as string, keyId);
  await userStore.fetchApiKeys(route.params.id as string);
}

function copyKey() {
  navigator.clipboard.writeText(generatedKey.value);
}

function toggleRole(roleId: string) {
  const idx = form.value.roles.indexOf(roleId);
  if (idx >= 0) form.value.roles.splice(idx, 1);
  else form.value.roles.push(roleId);
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900">{{ isEdit ? 'Edytuj uzytkownika' : 'Nowy uzytkownik' }}</h1>

    <form @submit.prevent="handleSubmit" class="mt-6 max-w-2xl space-y-6">
      <div v-if="error" class="rounded-md bg-red-50 p-3 text-sm text-red-700">{{ error }}</div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-gray-700">Imie</label>
          <input v-model="form.name" required class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Email</label>
          <input v-model="form.email" type="email" required class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>
      </div>

      <div v-if="!isEdit">
        <label class="block text-sm font-medium text-gray-700">Haslo</label>
        <input v-model="form.password" type="password" required minlength="6" class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
      </div>

      <div class="flex items-center gap-3">
        <Switch
          :model-value="form.isAdmin"
          @update:model-value="form.isAdmin = $event"
          :class="[form.isAdmin ? 'bg-primary-600' : 'bg-gray-200', 'relative inline-flex h-6 w-11 items-center rounded-full transition-colors']"
        >
          <span :class="[form.isAdmin ? 'translate-x-6' : 'translate-x-1', 'inline-block h-4 w-4 transform rounded-full bg-white transition-transform']" />
        </Switch>
        <span class="text-sm font-medium text-gray-700">Administrator</span>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Role</label>
        <div class="space-y-2">
          <label v-for="role in roleStore.roles" :key="role._id" class="flex items-center gap-2">
            <input
              type="checkbox"
              :checked="form.roles.includes(role._id)"
              @change="toggleRole(role._id)"
              class="rounded border-gray-300 text-primary-600"
            />
            <span class="text-sm text-gray-700">{{ role.name }}</span>
            <span class="text-xs text-gray-400">{{ role.description }}</span>
          </label>
        </div>
      </div>

      <div class="flex gap-3">
        <button type="submit" :disabled="loading" class="rounded-md bg-primary-600 px-6 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
          {{ loading ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Utworz uzytkownika' }}
        </button>
        <button type="button" @click="router.push('/users')" class="rounded-md border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Anuluj</button>
      </div>
    </form>

    <!-- API Keys section -->
    <div v-if="isEdit" class="mt-10 max-w-2xl">
      <h2 class="text-lg font-semibold text-gray-900">Klucze API</h2>

      <div class="mt-4 flex gap-2">
        <input v-model="newApiKeyName" placeholder="Nazwa klucza (np. Laptop biurowy)" class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        <button @click="handleGenerateKey" class="flex items-center gap-1 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
          <KeyIcon class="h-4 w-4" /> Wygeneruj
        </button>
      </div>

      <div class="mt-4 space-y-2">
        <div v-for="key in userStore.apiKeys" :key="key._id" class="flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-3">
          <div>
            <span class="text-sm font-medium text-gray-900">{{ key.name }}</span>
            <span class="ml-2 text-xs text-gray-400">{{ key.prefix }}...</span>
            <span v-if="!key.isActive" class="ml-2 text-xs text-red-500">(uniewazniony)</span>
          </div>
          <div class="flex items-center gap-3 text-xs text-gray-400">
            <span v-if="key.lastUsedAt">Ostatnio: {{ new Date(key.lastUsedAt).toLocaleDateString('pl-PL') }}</span>
            <button v-if="key.isActive" @click="handleRevokeKey(key._id)" class="text-red-400 hover:text-red-600"><TrashIcon class="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </div>

    <!-- Generated key dialog -->
    <Dialog :open="showKeyDialog" @close="showKeyDialog = false" class="relative z-50">
      <div class="fixed inset-0 bg-black/30" />
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel class="mx-auto max-w-lg rounded-lg bg-white p-6 shadow-xl">
          <DialogTitle class="text-lg font-semibold text-gray-900">Klucz API wygenerowany</DialogTitle>
          <p class="mt-2 text-sm text-red-600 font-medium">Zapisz ten klucz — nie bedzie mozna go zobaczyc ponownie!</p>
          <div class="mt-4 flex items-center gap-2 rounded-md bg-gray-100 p-3">
            <code class="flex-1 break-all text-sm">{{ generatedKey }}</code>
            <button @click="copyKey" class="text-gray-400 hover:text-gray-600"><ClipboardDocumentIcon class="h-5 w-5" /></button>
          </div>
          <button @click="showKeyDialog = false" class="mt-4 w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">Zamknij</button>
        </DialogPanel>
      </div>
    </Dialog>
  </div>
</template>
