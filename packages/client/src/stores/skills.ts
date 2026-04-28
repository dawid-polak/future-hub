import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../api/index';

export const useSkillsStore = defineStore('skills', () => {
  const skills = ref<any[]>([]);
  const currentSkill = ref<any>(null);
  const versions = ref<any[]>([]);
  const total = ref(0);
  const loading = ref(false);

  async function fetchSkills(params?: Record<string, any>) {
    loading.value = true;
    try {
      const { data } = await api.get('/skills', { params });
      skills.value = data.skills;
      total.value = data.total;
    } finally {
      loading.value = false;
    }
  }

  async function fetchSkill(id: string) {
    loading.value = true;
    try {
      const { data } = await api.get(`/skills/${id}`);
      currentSkill.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function createSkill(payload: any) {
    const { data } = await api.post('/skills', payload);
    return data;
  }

  async function updateSkill(id: string, payload: any) {
    const { data } = await api.put(`/skills/${id}`, payload);
    return data;
  }

  async function deleteSkill(id: string) {
    await api.delete(`/skills/${id}`);
  }

  async function publishVersion(id: string, payload: any) {
    const { data } = await api.post(`/skills/${id}/versions`, payload);
    return data;
  }

  async function fetchVersions(id: string) {
    const { data } = await api.get(`/skills/${id}/versions`);
    versions.value = data;
  }

  async function rollback(id: string, version: number) {
    const { data } = await api.post(`/skills/${id}/rollback/${version}`);
    return data;
  }

  return {
    skills, currentSkill, versions, total, loading,
    fetchSkills, fetchSkill, createSkill, updateSkill, deleteSkill,
    publishVersion, fetchVersions, rollback,
  };
});
