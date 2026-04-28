<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUsersStore } from '../../stores/users';
import StatusBadge from '../../components/statusBadge.vue';
import ConfirmDialog from '../../components/confirmDialog.vue';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline';

const store = useUsersStore();
const router = useRouter();
const search = ref('');
const deleteTarget = ref<any>(null);

onMounted(() => store.fetchUsers());

async function handleSearch() {
  await store.fetchUsers({ search: search.value });
}

async function handleDelete() {
  if (deleteTarget.value) {
    await store.deleteUser(deleteTarget.value._id);
    deleteTarget.value = null;
    await store.fetchUsers();
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Uzytkownicy</h1>
      <button @click="router.push('/users/new')" class="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
        <PlusIcon class="h-4 w-4" /> Nowy uzytkownik
      </button>
    </div>

    <div class="mt-4">
      <input v-model="search" @input="handleSearch" type="text" placeholder="Szukaj uzytkownikow..." class="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
    </div>

    <div class="mt-4 overflow-hidden rounded-lg bg-white shadow">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Imie</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Typ</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Akcje</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="user in store.users" :key="user._id" class="hover:bg-gray-50">
            <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ user.name }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ user.email }}</td>
            <td class="px-6 py-4">
              <span v-for="role in user.roles" :key="role._id" class="mr-1 inline-block rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">{{ role.name }}</span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ user.isAdmin ? 'Admin' : 'Pracownik' }}</td>
            <td class="px-6 py-4"><StatusBadge :active="user.isActive" /></td>
            <td class="px-6 py-4 text-right">
              <div class="flex justify-end gap-2">
                <button @click="router.push(`/users/${user._id}/edit`)" class="text-gray-400 hover:text-primary-600"><PencilIcon class="h-4 w-4" /></button>
                <button @click="deleteTarget = user" class="text-gray-400 hover:text-red-600"><TrashIcon class="h-4 w-4" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ConfirmDialog :open="!!deleteTarget" title="Dezaktywuj uzytkownika" :message="`Czy na pewno chcesz dezaktywowac '${deleteTarget?.name}'?`" confirm-label="Dezaktywuj" variant="danger" @confirm="handleDelete" @cancel="deleteTarget = null" />
  </div>
</template>
