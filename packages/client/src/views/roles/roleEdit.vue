<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRolesStore } from '../../stores/roles';
import { useSkillsStore } from '../../stores/skills';
import { useUsersStore } from '../../stores/users';
import { useFoldersStore } from '../../stores/folders';
import SearchAssign, { type AssignItem } from '../../components/searchAssign.vue';
import {
  UsersIcon, FolderIcon, CommandLineIcon,
} from '@heroicons/vue/24/outline';

const route = useRoute();
const router = useRouter();
const roleStore = useRolesStore();
const skillStore = useSkillsStore();
const userStore = useUsersStore();
const folderStore = useFoldersStore();

const isEdit = computed(() => !!route.params.id);
const loading = ref(false);
const error = ref('');

const form = ref({
  name: '',
  description: '',
});

const assignedSkillIds = ref<string[]>([]);
const assignedFolderIds = ref<string[]>([]);
const assignedUserIds = ref<string[]>([]);

const initialSkillIds = ref<string[]>([]);
const initialFolderIds = ref<string[]>([]);
const initialUserIds = ref<string[]>([]);

// Build search items
const folderItems = computed<AssignItem[]>(() =>
  folderStore.allFolders.map((f: any) => ({
    id: f._id,
    label: f.name,
    sublabel: f.description || undefined,
    icon: FolderIcon,
  }))
);

const skillItems = computed<AssignItem[]>(() =>
  skillStore.skills.map((s: any) => ({
    id: s._id,
    label: s.name,
    sublabel: s.category,
    icon: CommandLineIcon,
  }))
);

const userItems = computed<AssignItem[]>(() =>
  userStore.users.map((u: any) => ({
    id: u._id,
    label: u.name,
    sublabel: u.email,
    icon: UsersIcon,
  }))
);

onMounted(async () => {
  await Promise.all([
    skillStore.fetchSkills({ limit: 500 }),
    userStore.fetchUsers({ limit: 500 }),
    folderStore.fetchAll(),
  ]);

  if (isEdit.value) {
    const roleId = route.params.id as string;
    await roleStore.fetchRole(roleId);

    if (roleStore.currentRole) {
      form.value.name = roleStore.currentRole.name;
      form.value.description = roleStore.currentRole.description;
      assignedSkillIds.value = roleStore.currentRole.skills?.map((s: any) => s._id || s) || [];
      initialSkillIds.value = [...assignedSkillIds.value];
    }

    // Folders with this role
    for (const folder of folderStore.allFolders) {
      const hasRole = folder.roles?.some((r: any) => (r._id || r) === roleId);
      if (hasRole) {
        assignedFolderIds.value.push(folder._id);
      }
    }
    initialFolderIds.value = [...assignedFolderIds.value];

    // Users with this role
    for (const user of userStore.users) {
      const hasRole = user.roles?.some((r: any) => (r._id || r) === roleId);
      if (hasRole) {
        assignedUserIds.value.push(user._id);
      }
    }
    initialUserIds.value = [...assignedUserIds.value];
  }
});

async function handleSubmit() {
  loading.value = true;
  error.value = '';
  try {
    let roleId: string;

    if (isEdit.value) {
      await roleStore.updateRole(route.params.id as string, {
        ...form.value,
        skills: assignedSkillIds.value,
      });
      roleId = route.params.id as string;
    } else {
      const created = await roleStore.createRole({
        ...form.value,
        skills: assignedSkillIds.value,
      });
      roleId = created._id;
    }

    // Folder assignments diff
    const foldersToAdd = assignedFolderIds.value.filter((id) => !initialFolderIds.value.includes(id));
    const foldersToRemove = initialFolderIds.value.filter((id) => !assignedFolderIds.value.includes(id));

    for (const folderId of foldersToAdd) {
      const folder = folderStore.allFolders.find((f: any) => f._id === folderId);
      if (folder) {
        const currentRoles = (folder.roles || []).map((r: any) => r._id || r);
        if (!currentRoles.includes(roleId)) {
          await folderStore.updateFolder(folderId, { roles: [...currentRoles, roleId] });
        }
      }
    }
    for (const folderId of foldersToRemove) {
      const folder = folderStore.allFolders.find((f: any) => f._id === folderId);
      if (folder) {
        const currentRoles = (folder.roles || []).map((r: any) => r._id || r).filter((r: string) => r !== roleId);
        await folderStore.updateFolder(folderId, { roles: currentRoles });
      }
    }

    // User assignments diff
    const usersToAdd = assignedUserIds.value.filter((id) => !initialUserIds.value.includes(id));
    const usersToRemove = initialUserIds.value.filter((id) => !assignedUserIds.value.includes(id));

    for (const userId of usersToAdd) {
      const user = userStore.users.find((u: any) => u._id === userId);
      if (user) {
        const currentRoles = (user.roles || []).map((r: any) => r._id || r);
        if (!currentRoles.includes(roleId)) {
          await userStore.updateUser(userId, { roles: [...currentRoles, roleId] });
        }
      }
    }
    for (const userId of usersToRemove) {
      const user = userStore.users.find((u: any) => u._id === userId);
      if (user) {
        const currentRoles = (user.roles || []).map((r: any) => r._id || r).filter((r: string) => r !== roleId);
        await userStore.updateUser(userId, { roles: currentRoles });
      }
    }

    router.push('/roles');
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Blad zapisu';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900">{{ isEdit ? 'Edytuj role' : 'Nowa rola' }}</h1>

    <form @submit.prevent="handleSubmit" class="mt-6 max-w-2xl space-y-6">
      <div v-if="error" class="rounded-md bg-red-50 p-3 text-sm text-red-700">{{ error }}</div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Nazwa</label>
        <input v-model="form.name" required class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="np. frontend-dev" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Opis</label>
        <input v-model="form.description" class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
      </div>

      <!-- Folders -->
      <div>
        <label class="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          <FolderIcon class="h-4 w-4 text-yellow-500" />
          Foldery ({{ assignedFolderIds.length }})
        </label>
        <p class="text-xs text-gray-400 mb-2">Wszystkie skille w folderze i podfolderach beda dostepne dla tej roli</p>
        <SearchAssign
          :items="folderItems"
          v-model="assignedFolderIds"
          placeholder="Szukaj folderu..."
          chip-color="bg-yellow-100 text-yellow-800"
        />
      </div>

      <!-- Skills -->
      <div>
        <label class="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          <CommandLineIcon class="h-4 w-4 text-primary-500" />
          Pojedyncze skille ({{ assignedSkillIds.length }})
        </label>
        <p class="text-xs text-gray-400 mb-2">Skille przypisane bezposrednio, niezaleznie od folderow</p>
        <SearchAssign
          :items="skillItems"
          v-model="assignedSkillIds"
          placeholder="Szukaj skilla..."
          chip-color="bg-primary-100 text-primary-700"
        />
      </div>

      <!-- Users -->
      <div>
        <label class="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          <UsersIcon class="h-4 w-4 text-amber-500" />
          Uzytkownicy ({{ assignedUserIds.length }})
        </label>
        <SearchAssign
          :items="userItems"
          v-model="assignedUserIds"
          placeholder="Szukaj uzytkownika po imieniu lub emailu..."
          chip-color="bg-amber-100 text-amber-700"
        />
      </div>

      <div class="flex gap-3">
        <button type="submit" :disabled="loading" class="rounded-md bg-primary-600 px-6 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
          {{ loading ? 'Zapisywanie...' : isEdit ? 'Zapisz zmiany' : 'Utworz role' }}
        </button>
        <button type="button" @click="router.push('/roles')" class="rounded-md border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Anuluj</button>
      </div>
    </form>
  </div>
</template>
