import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../api/index';

export const useFoldersStore = defineStore('folders', () => {
  const tree = ref<{ folders: any[]; rootSkills: any[] }>({ folders: [], rootSkills: [] });
  const allFolders = ref<any[]>([]);
  const currentFolder = ref<any>(null);
  const loading = ref(false);

  async function fetchTree() {
    loading.value = true;
    try {
      const { data } = await api.get('/folders/tree');
      tree.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchAll() {
    const { data } = await api.get('/folders');
    allFolders.value = data;
  }

  async function fetchFolder(id: string) {
    loading.value = true;
    try {
      const { data } = await api.get(`/folders/${id}`);
      currentFolder.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function createFolder(payload: any) {
    const { data } = await api.post('/folders', payload);
    return data;
  }

  async function updateFolder(id: string, payload: any) {
    const { data } = await api.put(`/folders/${id}`, payload);
    return data;
  }

  async function deleteFolder(id: string) {
    await api.delete(`/folders/${id}`);
  }

  async function moveSkill(skillId: string, folderId: string | null) {
    const { data } = await api.put(`/folders/skills/${skillId}/move`, { folderId });
    return data;
  }

  return {
    tree, allFolders, currentFolder, loading,
    fetchTree, fetchAll, fetchFolder, createFolder, updateFolder, deleteFolder, moveSkill,
  };
});
