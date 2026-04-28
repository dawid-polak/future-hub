<script setup lang="ts">
import { ref } from 'vue';
import { CloudArrowUpIcon, XMarkIcon } from '@heroicons/vue/24/outline';

const emit = defineEmits<{ 'update:files': [files: File[]] }>();
const files = ref<File[]>([]);
const isDragging = ref(false);

function onDrop(e: DragEvent) {
  isDragging.value = false;
  if (e.dataTransfer?.files) {
    addFiles(Array.from(e.dataTransfer.files));
  }
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files) {
    addFiles(Array.from(input.files));
  }
}

function addFiles(newFiles: File[]) {
  files.value = [...files.value, ...newFiles];
  emit('update:files', files.value);
}

function removeFile(index: number) {
  files.value.splice(index, 1);
  emit('update:files', files.value);
}
</script>

<template>
  <div>
    <div
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="onDrop"
      :class="[
        isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300',
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors',
      ]"
    >
      <CloudArrowUpIcon class="h-10 w-10 text-gray-400" />
      <p class="mt-2 text-sm text-gray-600">Przeciagnij pliki lub
        <label class="cursor-pointer text-primary-600 hover:text-primary-500">
          wybierz
          <input type="file" multiple class="hidden" @change="onFileSelect" />
        </label>
      </p>
    </div>
    <ul v-if="files.length" class="mt-3 space-y-1">
      <li v-for="(file, i) in files" :key="i" class="flex items-center justify-between rounded bg-gray-100 px-3 py-1.5 text-sm">
        <span>{{ file.name }} <span class="text-gray-400">({{ (file.size / 1024).toFixed(1) }} KB)</span></span>
        <button @click="removeFile(i)" class="text-gray-400 hover:text-red-500"><XMarkIcon class="h-4 w-4" /></button>
      </li>
    </ul>
  </div>
</template>
