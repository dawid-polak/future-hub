import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../api/index';

export const useUsersStore = defineStore('users', () => {
  const users = ref<any[]>([]);
  const currentUser = ref<any>(null);
  const apiKeys = ref<any[]>([]);
  const total = ref(0);
  const loading = ref(false);

  async function fetchUsers(params?: Record<string, any>) {
    loading.value = true;
    try {
      const { data } = await api.get('/users', { params });
      users.value = data.users;
      total.value = data.total;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUser(id: string) {
    loading.value = true;
    try {
      const { data } = await api.get(`/users/${id}`);
      currentUser.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function createUser(payload: any) {
    const { data } = await api.post('/users', payload);
    return data;
  }

  async function updateUser(id: string, payload: any) {
    const { data } = await api.put(`/users/${id}`, payload);
    return data;
  }

  async function deleteUser(id: string) {
    await api.delete(`/users/${id}`);
  }

  async function generateApiKey(userId: string, name: string) {
    const { data } = await api.post(`/users/${userId}/apiKeys`, { name });
    return data;
  }

  async function fetchApiKeys(userId: string) {
    const { data } = await api.get(`/users/${userId}/apiKeys`);
    apiKeys.value = data;
  }

  async function revokeApiKey(userId: string, keyId: string) {
    await api.delete(`/users/${userId}/apiKeys/${keyId}`);
  }

  return {
    users, currentUser, apiKeys, total, loading,
    fetchUsers, fetchUser, createUser, updateUser, deleteUser,
    generateApiKey, fetchApiKeys, revokeApiKey,
  };
});
