import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../api/index';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(null);
  const accessToken = ref(localStorage.getItem('accessToken') || '');
  const isAuthenticated = computed(() => !!accessToken.value);

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    accessToken.value = data.accessToken;
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    user.value = data.user;
  }

  function logout() {
    accessToken.value = '';
    user.value = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  async function fetchMe() {
    const { data } = await api.get('/auth/me');
    user.value = data;
  }

  return { user, accessToken, isAuthenticated, login, logout, fetchMe };
});
