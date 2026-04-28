<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useRolesStore } from '../../stores/roles';
import ConfirmDialog from '../../components/confirmDialog.vue';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline';

const store = useRolesStore();
const router = useRouter();
const deleteTarget = ref<any>(null);

onMounted(() => store.fetchRoles());

async function handleDelete() {
  if (deleteTarget.value) {
    await store.deleteRole(deleteTarget.value._id);
    deleteTarget.value = null;
    await store.fetchRoles();
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Role</h1>
      <button @click="router.push('/roles/new')" class="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
        <PlusIcon class="h-4 w-4" /> Nowa rola
      </button>
    </div>

    <div class="mt-4 overflow-hidden rounded-lg bg-white shadow">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Nazwa</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Opis</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Skille</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Uzytkownicy</th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Akcje</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="role in store.roles" :key="role._id" class="hover:bg-gray-50">
            <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ role.name }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ role.description }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ role.skills?.length || 0 }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ role.userCount || 0 }}</td>
            <td class="px-6 py-4 text-right">
              <div class="flex justify-end gap-3">
                <button @click="router.push(`/roles/${role._id}/edit`)" class="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">Edytuj</button>
                <button @click="deleteTarget = role" class="text-gray-400 hover:text-red-600"><TrashIcon class="h-4 w-4" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ConfirmDialog :open="!!deleteTarget" title="Usun role" :message="`Czy na pewno chcesz usunac role '${deleteTarget?.name}'? Zostanie odpita od wszystkich uzytkownikow.`" confirm-label="Usun" variant="danger" @confirm="handleDelete" @cancel="deleteTarget = null" />
  </div>
</template>
