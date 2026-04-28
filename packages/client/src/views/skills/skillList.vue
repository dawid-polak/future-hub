<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSkillsStore } from '../../stores/skills';
import { useFoldersStore } from '../../stores/folders';
import { useRolesStore } from '../../stores/roles';
import ConfirmDialog from '../../components/confirmDialog.vue';
import FolderRow from '../../components/folderRow.vue';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';
import {
  PlusIcon, PencilIcon, ClockIcon, TrashIcon,
  FolderPlusIcon, DocumentIcon, ShieldCheckIcon,
} from '@heroicons/vue/24/outline';

const skillStore = useSkillsStore();
const folderStore = useFoldersStore();
const roleStore = useRolesStore();
const router = useRouter();

const deleteTarget = ref<any>(null);
const deleteType = ref<'skill' | 'folder'>('skill');

// Folder dialog
const showFolderDialog = ref(false);
const editingFolder = ref<any>(null);
const folderForm = ref({ name: '', description: '', parent: null as string | null, roles: [] as string[] });
const folderError = ref('');

// Reactive expanded state (object, not Set — Vue tracks object keys reactively)
const expandedIds = reactive<Record<string, boolean>>({});

// Drag & drop state
const dragOverId = ref<string | null>(null);
const draggingId = ref<string | null>(null);
let autoExpandTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(async () => {
  await Promise.all([folderStore.fetchTree(), folderStore.fetchAll(), roleStore.fetchRoles()]);
});

async function reload() {
  await Promise.all([folderStore.fetchTree(), folderStore.fetchAll()]);
}

function toggleFolder(folderId: string) {
  expandedIds[folderId] = !expandedIds[folderId];
}

// --- Folder CRUD ---

function openCreateFolder(parentId: string | null = null) {
  editingFolder.value = null;
  folderForm.value = { name: '', description: '', parent: parentId, roles: [] };
  folderError.value = '';
  showFolderDialog.value = true;
}

function openEditFolder(folder: any) {
  editingFolder.value = folder;
  folderForm.value = {
    name: folder.name,
    description: folder.description || '',
    parent: folder.parent?._id || folder.parent || null,
    roles: folder.roles?.map((r: any) => r._id || r) || [],
  };
  folderError.value = '';
  showFolderDialog.value = true;
}

async function saveFolder() {
  folderError.value = '';
  try {
    const payload = {
      name: folderForm.value.name,
      description: folderForm.value.description,
      parent: folderForm.value.parent || null,
      roles: folderForm.value.roles,
    };
    if (editingFolder.value) {
      await folderStore.updateFolder(editingFolder.value._id, payload);
    } else {
      await folderStore.createFolder(payload);
    }
    showFolderDialog.value = false;
    await reload();
  } catch (e: any) {
    folderError.value = e.response?.data?.error || 'Blad zapisu folderu';
  }
}

function toggleRole(roleId: string) {
  const idx = folderForm.value.roles.indexOf(roleId);
  if (idx >= 0) folderForm.value.roles.splice(idx, 1);
  else folderForm.value.roles.push(roleId);
}

// --- Delete ---

async function handleDelete() {
  if (!deleteTarget.value) return;
  try {
    if (deleteType.value === 'skill') {
      await skillStore.deleteSkill(deleteTarget.value._id);
    } else {
      await folderStore.deleteFolder(deleteTarget.value._id);
    }
    deleteTarget.value = null;
    await reload();
  } catch (e: any) {
    alert(e.response?.data?.error || 'Blad usuwania');
    deleteTarget.value = null;
  }
}

// --- Drag & Drop ---

function onDragStartItem(type: string, id: string, e: DragEvent) {
  draggingId.value = id;
  if (e.dataTransfer) {
    e.dataTransfer.setData('application/json', JSON.stringify({ type, id }));
    e.dataTransfer.effectAllowed = 'move';
  }
}

function onDragEnterFolder(folderId: string) {
  if (folderId === draggingId.value) return;
  dragOverId.value = folderId;

  // Auto-expand folder after 600ms hover
  if (autoExpandTimer) clearTimeout(autoExpandTimer);
  autoExpandTimer = setTimeout(() => {
    if (dragOverId.value === folderId) {
      expandedIds[folderId] = true;
    }
  }, 600);
}

function onDragLeaveFolder() {
  dragOverId.value = null;
  if (autoExpandTimer) {
    clearTimeout(autoExpandTimer);
    autoExpandTimer = null;
  }
}

async function onDropOnFolder(folderId: string, e: DragEvent) {
  dragOverId.value = null;
  if (autoExpandTimer) clearTimeout(autoExpandTimer);

  const raw = e.dataTransfer?.getData('application/json');
  const currentDraggingId = draggingId.value;
  draggingId.value = null;
  if (!raw) return;

  try {
    const item = JSON.parse(raw);
    if (item.id === folderId) return; // can't drop on itself
    if (item.type === 'skill') {
      await folderStore.moveSkill(item.id, folderId);
    } else if (item.type === 'folder') {
      await folderStore.updateFolder(item.id, { parent: folderId });
    }
    expandedIds[folderId] = true;
    await reload();
  } catch (err: any) {
    // Silently handle — likely cycle detection
  }
}

// Root drop zone
function onRootDragEnter(e: DragEvent) {
  e.preventDefault();
  dragOverId.value = '__root__';
}

function onRootDragOver(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
}

function onRootDragLeave(e: DragEvent) {
  const related = e.relatedTarget as HTMLElement | null;
  const current = e.currentTarget as HTMLElement;
  if (related && current.contains(related)) return;
  dragOverId.value = null;
}

async function onRootDrop(e: DragEvent) {
  e.preventDefault();
  dragOverId.value = null;
  draggingId.value = null;

  const raw = e.dataTransfer?.getData('application/json');
  if (!raw) return;

  try {
    const item = JSON.parse(raw);
    if (item.type === 'skill') {
      await folderStore.moveSkill(item.id, null);
    } else if (item.type === 'folder') {
      await folderStore.updateFolder(item.id, { parent: null });
    }
    await reload();
  } catch {}
}

// Root skill drag
function onRootSkillDragStart(skill: any, e: DragEvent) {
  draggingId.value = skill._id;
  if (e.dataTransfer) {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'skill', id: skill._id }));
    e.dataTransfer.effectAllowed = 'move';
  }
}

// Global dragend — cleanup
function onGlobalDragEnd() {
  draggingId.value = null;
  dragOverId.value = null;
  if (autoExpandTimer) {
    clearTimeout(autoExpandTimer);
    autoExpandTimer = null;
  }
}
</script>

<template>
  <div @dragend="onGlobalDragEnd">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Skille</h1>
      <div class="flex gap-2">
        <button @click="openCreateFolder(null)" class="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <FolderPlusIcon class="h-4 w-4" /> Nowy folder
        </button>
        <button @click="router.push('/skills/new')" class="flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
          <PlusIcon class="h-4 w-4" /> Nowy skill
        </button>
      </div>
    </div>

    <p class="mt-2 text-xs text-gray-400">Przeciagnij skille lub foldery aby zmienic ich polozenie</p>

    <div v-if="folderStore.loading" class="mt-4 text-center text-gray-400">Ladowanie...</div>

    <div v-else class="mt-4 rounded-lg bg-white shadow overflow-hidden">
      <div>
        <!-- Folders -->
        <FolderRow
          v-for="folder in folderStore.tree.folders"
          :key="folder._id"
          :folder="folder"
          :depth="0"
          :expanded-ids="expandedIds"
          :drag-over-id="dragOverId"
          :dragging-id="draggingId"
          @toggle="toggleFolder"
          @edit="openEditFolder"
          @delete="(f) => { deleteTarget = f; deleteType = 'folder'; }"
          @create-subfolder="openCreateFolder"
          @edit-skill="(s) => router.push(`/skills/${s._id}/edit`)"
          @versions="(s) => router.push(`/skills/${s._id}/versions`)"
          @delete-skill="(s) => { deleteTarget = s; deleteType = 'skill'; }"
          @drag-enter-folder="onDragEnterFolder"
          @drag-leave-folder="onDragLeaveFolder"
          @drop-on-folder="onDropOnFolder"
          @drag-start-item="onDragStartItem"
        />

        <!-- Root-level skills -->
        <div
          v-for="skill in folderStore.tree.rootSkills"
          :key="skill._id"
          :class="[
            'flex items-center gap-3 px-4 py-2.5 transition-opacity duration-150',
            draggingId === skill._id ? 'opacity-40' : 'hover:bg-gray-50 cursor-pointer',
          ]"
          draggable="true"
          @click="router.push(`/skills/${skill._id}/edit`)"
          @dragstart="onRootSkillDragStart(skill, $event)"
        >
          <DocumentIcon class="h-4 w-4 text-gray-400 ml-6" />
          <span class="flex-1 text-sm font-medium text-gray-900 truncate">{{ skill.name }}</span>
          <span class="text-xs text-gray-400">{{ skill.category }}</span>
          <div class="flex gap-1.5" @click.stop>
            <button @click="router.push(`/skills/${skill._id}/versions`)" class="text-gray-400 hover:text-primary-600" title="Wersje"><ClockIcon class="h-4 w-4" /></button>
            <button @click="deleteTarget = skill; deleteType = 'skill'" class="text-gray-400 hover:text-red-600" title="Usun"><TrashIcon class="h-4 w-4" /></button>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="!folderStore.tree.folders.length && !folderStore.tree.rootSkills.length" class="p-8 text-center text-sm text-gray-400">
          Brak skilli i folderow
        </div>
      </div>

      <!-- Root drop zone -->
      <div
        :class="[
          'border-t-2 border-dashed py-3 text-center text-xs transition-all duration-150',
          dragOverId === '__root__' ? 'border-primary-400 bg-primary-50 text-primary-600 py-6' : 'border-gray-200 text-gray-400',
        ]"
        @dragenter="onRootDragEnter"
        @dragover="onRootDragOver"
        @dragleave="onRootDragLeave"
        @drop="onRootDrop"
      >
        Upusc tutaj aby przeniesc do katalogu glownego
      </div>
    </div>

    <!-- Folder create/edit dialog -->
    <Dialog :open="showFolderDialog" @close="showFolderDialog = false" class="relative z-50">
      <div class="fixed inset-0 bg-black/30" />
      <div class="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel class="mx-auto w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <DialogTitle class="text-lg font-semibold text-gray-900">
            {{ editingFolder ? 'Edytuj folder' : 'Nowy folder' }}
          </DialogTitle>
          <form @submit.prevent="saveFolder" class="mt-4 space-y-4">
            <div v-if="folderError" class="rounded-md bg-red-50 p-3 text-sm text-red-700">{{ folderError }}</div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Nazwa</label>
              <input v-model="folderForm.name" required class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="np. Frontend" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Opis</label>
              <input v-model="folderForm.description" class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Folder nadrzedny</label>
              <select v-model="folderForm.parent" class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500">
                <option :value="null">— Katalog glowny —</option>
                <option v-for="f in folderStore.allFolders" :key="f._id" :value="f._id" :disabled="f._id === editingFolder?._id">
                  {{ f.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <ShieldCheckIcon class="h-4 w-4" /> Przypisane role
              </label>
              <p class="text-xs text-gray-400 mb-2">Uzytkownicy z tymi rolami zobacza wszystkie skille w tym folderze i podfolderach</p>
              <div class="max-h-40 overflow-y-auto space-y-1.5 rounded-md border border-gray-200 p-2">
                <label v-for="role in roleStore.roles" :key="role._id" class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" :checked="folderForm.roles.includes(role._id)" @change="toggleRole(role._id)" class="rounded border-gray-300 text-primary-600" />
                  <span class="text-sm text-gray-700">{{ role.name }}</span>
                </label>
                <p v-if="!roleStore.roles.length" class="text-xs text-gray-400">Brak rol — najpierw utworz role</p>
              </div>
            </div>
            <div class="flex justify-end gap-3">
              <button type="button" @click="showFolderDialog = false" class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Anuluj</button>
              <button type="submit" class="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">{{ editingFolder ? 'Zapisz' : 'Utworz' }}</button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>

    <!-- Delete confirm -->
    <ConfirmDialog
      :open="!!deleteTarget"
      :title="deleteType === 'folder' ? 'Usun folder' : 'Dezaktywuj skill'"
      :message="deleteType === 'folder'
        ? `Usunac folder '${deleteTarget?.name}'? Podfoldery i skille zostana przeniesione do folderu nadrzednego.`
        : `Dezaktywowac skill '${deleteTarget?.name}'?`"
      :confirm-label="deleteType === 'folder' ? 'Usun' : 'Dezaktywuj'"
      variant="danger"
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
