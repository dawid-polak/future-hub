<script setup lang="ts">
import { computed } from 'vue';
import {
  FolderIcon, FolderOpenIcon, FolderPlusIcon,
  ChevronRightIcon, PencilIcon, TrashIcon,
  DocumentIcon, ClockIcon,
  ShieldCheckIcon,
} from '@heroicons/vue/24/outline';

const props = defineProps<{
  folder: any;
  depth: number;
  expandedIds: Record<string, boolean>;
  dragOverId: string | null;
  draggingId: string | null;
}>();

const emit = defineEmits<{
  toggle: [id: string];
  edit: [folder: any];
  'delete': [folder: any];
  createSubfolder: [parentId: string];
  editSkill: [skill: any];
  versions: [skill: any];
  deleteSkill: [skill: any];
  dragEnterFolder: [folderId: string];
  dragLeaveFolder: [];
  dropOnFolder: [folderId: string, e: DragEvent];
  dragStartItem: [type: string, id: string, e: DragEvent];
}>();

const isExpanded = computed(() => !!props.expandedIds[props.folder._id]);
const hasChildren = computed(() => (props.folder.children?.length || 0) + (props.folder.skills?.length || 0) > 0);
const isOver = computed(() => props.dragOverId === props.folder._id && props.draggingId !== props.folder._id);
const isDragging = computed(() => props.draggingId === props.folder._id);

const padLeft = computed(() => `${props.depth * 24 + 16}px`);
const skillPad = computed(() => `${(props.depth + 1) * 24 + 30}px`);

function onFolderDragStart(e: DragEvent) {
  e.stopPropagation();
  emit('dragStartItem', 'folder', props.folder._id, e);
}

function onFolderDragEnter(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  emit('dragEnterFolder', props.folder._id);
}

function onFolderDragOver(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
}

function onFolderDragLeave(e: DragEvent) {
  const related = e.relatedTarget as HTMLElement | null;
  const current = e.currentTarget as HTMLElement;
  if (related && current.contains(related)) return;
  emit('dragLeaveFolder');
}

function onFolderDrop(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  emit('dropOnFolder', props.folder._id, e);
}

function onSkillDragStart(skill: any, e: DragEvent) {
  e.stopPropagation();
  emit('dragStartItem', 'skill', skill._id, e);
}
</script>

<template>
  <div>
    <!-- Folder row -->
    <div
      :class="[
        'flex items-center gap-2 py-2.5 transition-all duration-150',
        isDragging ? 'opacity-40' : 'cursor-pointer',
        isOver ? 'bg-primary-50 ring-2 ring-inset ring-primary-400 rounded-sm' : 'hover:bg-gray-50',
      ]"
      :style="{ paddingLeft: padLeft }"
      draggable="true"
      @click="emit('toggle', folder._id)"
      @dragstart="onFolderDragStart"
      @dragenter="onFolderDragEnter"
      @dragover="onFolderDragOver"
      @dragleave="onFolderDragLeave"
      @drop="onFolderDrop"
    >
      <ChevronRightIcon
        v-if="hasChildren"
        :class="['h-3.5 w-3.5 text-gray-400 transition-transform duration-200', isExpanded && 'rotate-90']"
      />
      <span v-else class="w-3.5" />
      <component :is="isExpanded ? FolderOpenIcon : FolderIcon" class="h-5 w-5 text-yellow-500 flex-shrink-0" />
      <span class="flex-1 text-sm font-medium text-gray-900 truncate">{{ folder.name }}</span>
      <span
        v-for="role in folder.roles"
        :key="role._id || role"
        class="inline-flex items-center gap-0.5 rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700 flex-shrink-0"
      >
        <ShieldCheckIcon class="h-3 w-3" />{{ role.name || role }}
      </span>
      <span class="text-xs text-gray-400 mr-1 flex-shrink-0">{{ folder.skills?.length || 0 }}</span>
      <div class="flex gap-1.5 pr-4 flex-shrink-0" @click.stop>
        <button @click="emit('createSubfolder', folder._id)" class="text-gray-400 hover:text-primary-600" title="Nowy podfolder"><FolderPlusIcon class="h-4 w-4" /></button>
        <button @click="emit('edit', folder)" class="text-gray-400 hover:text-primary-600" title="Edytuj"><PencilIcon class="h-4 w-4" /></button>
        <button @click="emit('delete', folder)" class="text-gray-400 hover:text-red-600" title="Usun"><TrashIcon class="h-4 w-4" /></button>
      </div>
    </div>

    <!-- Children (expanded) -->
    <div v-if="isExpanded">
      <folderRow
        v-for="child in folder.children"
        :key="child._id"
        :folder="child"
        :depth="depth + 1"
        :expanded-ids="expandedIds"
        :drag-over-id="dragOverId"
        :dragging-id="draggingId"
        @toggle="(id) => emit('toggle', id)"
        @edit="(f) => emit('edit', f)"
        @delete="(f) => emit('delete', f)"
        @create-subfolder="(id) => emit('createSubfolder', id)"
        @edit-skill="(s) => emit('editSkill', s)"
        @versions="(s) => emit('versions', s)"
        @delete-skill="(s) => emit('deleteSkill', s)"
        @drag-enter-folder="(id) => emit('dragEnterFolder', id)"
        @drag-leave-folder="emit('dragLeaveFolder')"
        @drop-on-folder="(fid, e) => emit('dropOnFolder', fid, e)"
        @drag-start-item="(t, id, e) => emit('dragStartItem', t, id, e)"
      />
      <div
        v-for="skill in folder.skills"
        :key="skill._id"
        :class="[
          'flex items-center gap-3 py-2 transition-opacity duration-150',
          draggingId === skill._id ? 'opacity-40' : 'hover:bg-gray-50 cursor-pointer',
        ]"
        :style="{ paddingLeft: skillPad }"
        draggable="true"
        @click="emit('editSkill', skill)"
        @dragstart="onSkillDragStart(skill, $event)"
      >
        <DocumentIcon class="h-4 w-4 text-gray-400 flex-shrink-0" />
        <span class="flex-1 text-sm text-gray-700 truncate">{{ skill.name }}</span>
        <span class="text-xs text-gray-400 flex-shrink-0">{{ skill.category }}</span>
        <div class="flex gap-1.5 pr-4 flex-shrink-0" @click.stop>
          <button @click="emit('versions', skill)" class="text-gray-400 hover:text-primary-600" title="Wersje"><ClockIcon class="h-4 w-4" /></button>
          <button @click="emit('deleteSkill', skill)" class="text-gray-400 hover:text-red-600" title="Usun"><TrashIcon class="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  </div>
</template>
