import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../api/index';

export const useRolesStore = defineStore('roles', () => {
  const roles = ref<any[]>([]);
  const currentRole = ref<any>(null);
  const loading = ref(false);

  async function fetchRoles() {
    loading.value = true;
    try {
      const { data } = await api.get('/roles');
      roles.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchRole(id: string) {
    loading.value = true;
    try {
      const { data } = await api.get(`/roles/${id}`);
      currentRole.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function createRole(payload: any) {
    const { data } = await api.post('/roles', payload);
    return data;
  }

  async function updateRole(id: string, payload: any) {
    const { data } = await api.put(`/roles/${id}`, payload);
    return data;
  }

  async function deleteRole(id: string) {
    await api.delete(`/roles/${id}`);
  }

  return { roles, currentRole, loading, fetchRoles, fetchRole, createRole, updateRole, deleteRole };
});
