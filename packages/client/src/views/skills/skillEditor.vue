<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSkillsStore } from '../../stores/skills';
import { useFoldersStore } from '../../stores/folders';
import MarkdownEditor from '../../components/markdownEditor.vue';

const route = useRoute();
const router = useRouter();
const store = useSkillsStore();
const folderStore = useFoldersStore();

const isEdit = computed(() => !!route.params.id);
const loading = ref(false);
const error = ref('');

const form = ref({
  name: '',
  description: '',
  category: 'general',
  tags: '',
  content: '',
  changelog: '',
  folder: null as string | null,
});

onMounted(async () => {
  await folderStore.fetchAll();
  if (isEdit.value) {
    await store.fetchSkill(route.params.id as string);
    if (store.currentSkill) {
      form.value.name = store.currentSkill.name;
      form.value.description = store.currentSkill.description;
      form.value.category = store.currentSkill.category;
      form.value.tags = store.currentSkill.tags?.join(', ') || '';
      form.value.content = store.currentSkill.currentVersionData?.content || '';
      form.value.folder = store.currentSkill.folder || null;
    }
  }
});

async function handleSubmit() {
  loading.value = true;
  error.value = '';
  try {
    const tags = form.value.tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (isEdit.value) {
      await store.updateSkill(route.params.id as string, {
        name: form.value.name,
        description: form.value.description,
        category: form.value.category,
        tags,
        folder: form.value.folder,
      });
      if (form.value.content !== store.currentSkill?.currentVersionData?.content) {
        await store.publishVersion(route.params.id as string, {
          content: form.value.content,
          changelog: form.value.changelog || 'Aktualizacja tresci',
        });
      }
    } else {
      await store.createSkill({
        name: form.value.name,
        description: form.value.description,
        category: form.value.category,
        tags,
        content: form.value.content,
        changelog: 'Wersja poczatkowa',
        folder: form.value.folder,
      });
    }
    router.push('/skills');
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Blad zapisu';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900">{{ isEdit ? 'Edytuj skill' : 'Nowy skill' }}</h1>

    <form @submit.prevent="handleSubmit" class="mt-6 space-y-6">
      <div v-if="error" class="rounded-md bg-red-50 p-3 text-sm text-red-700">{{ error }}</div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-gray-700">Nazwa</label>
          <input v-model="form.name" required class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Kategoria</label>
          <input v-model="form.category" class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Opis</label>
        <input v-model="form.description" class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Tagi (rozdzielone przecinkiem)</label>
        <input v-model="form.tags" class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="vue, typescript, components" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Folder</label>
        <select v-model="form.folder" class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
          <option :value="null">— Bez folderu —</option>
          <option v-for="f in folderStore.allFolders" :key="f._id" :value="f._id">{{ f.name }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Tresc (Markdown)</label>
        <MarkdownEditor v-model="form.content" />
      </div>

      <div v-if="isEdit">
        <label class="block text-sm font-medium text-gray-700">Opis zmian (changelog)</label>
        <input v-model="form.changelog" class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="Co sie zmienilo w tej wersji..." />
      </div>

      <div class="flex gap-3">
        <button type="submit" :disabled="loading" class="rounded-md bg-primary-600 px-6 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
          {{ loading ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Utworz skill' }}
        </button>
        <button type="button" @click="router.push('/skills')" class="rounded-md border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Anuluj
        </button>
      </div>
    </form>
  </div>
</template>
