<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline';

export interface AssignItem {
  id: string;
  label: string;
  sublabel?: string;
  icon?: any;
}

const props = defineProps<{
  items: AssignItem[];
  modelValue: string[];
  placeholder?: string;
  chipColor?: string; // tailwind bg class e.g. 'bg-amber-100 text-amber-700'
}>();

const emit = defineEmits<{
  'update:modelValue': [ids: string[]];
}>();

const query = ref('');
const open = ref(false);
const wrapperRef = ref<HTMLElement | null>(null);

const selectedSet = computed(() => new Set(props.modelValue));

const filteredItems = computed(() => {
  if (!query.value.trim()) return [];
  const q = query.value.toLowerCase();
  return props.items
    .filter((item) => !selectedSet.value.has(item.id))
    .filter((item) =>
      item.label.toLowerCase().includes(q) ||
      (item.sublabel && item.sublabel.toLowerCase().includes(q))
    )
    .slice(0, 15);
});

const selectedItems = computed(() =>
  props.modelValue
    .map((id) => props.items.find((item) => item.id === id))
    .filter(Boolean) as AssignItem[]
);

function addItem(id: string) {
  if (!selectedSet.value.has(id)) {
    emit('update:modelValue', [...props.modelValue, id]);
  }
  query.value = '';
  open.value = false;
}

function removeItem(id: string) {
  emit('update:modelValue', props.modelValue.filter((i) => i !== id));
}

function onInput() {
  open.value = query.value.trim().length > 0;
}

function onClickOutside(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    open.value = false;
  }
}

onMounted(() => document.addEventListener('click', onClickOutside));
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside));
</script>

<template>
  <div ref="wrapperRef" class="relative">
    <!-- Search input -->
    <div class="relative">
      <MagnifyingGlassIcon class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        v-model="query"
        @input="onInput"
        @focus="onInput"
        type="text"
        :placeholder="placeholder || 'Szukaj...'"
        class="block w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
    </div>

    <!-- Dropdown results -->
    <div
      v-if="open && filteredItems.length"
      class="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-56 overflow-y-auto"
    >
      <button
        v-for="item in filteredItems"
        :key="item.id"
        type="button"
        @click="addItem(item.id)"
        class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
      >
        <component v-if="item.icon" :is="item.icon" class="h-4 w-4 text-gray-400 flex-shrink-0" />
        <span class="text-gray-900">{{ item.label }}</span>
        <span v-if="item.sublabel" class="text-xs text-gray-400 truncate">{{ item.sublabel }}</span>
      </button>
    </div>
    <div
      v-else-if="open && query.trim() && !filteredItems.length"
      class="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-400 shadow-lg"
    >
      Brak wynikow dla "{{ query }}"
    </div>

    <!-- Selected chips -->
    <div v-if="selectedItems.length" class="mt-2 flex flex-wrap gap-1.5">
      <span
        v-for="item in selectedItems"
        :key="item.id"
        :class="[
          props.chipColor || 'bg-primary-100 text-primary-700',
          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        ]"
      >
        <component v-if="item.icon" :is="item.icon" class="h-3 w-3" />
        {{ item.label }}
        <button type="button" @click="removeItem(item.id)" class="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors">
          <XMarkIcon class="h-3 w-3" />
        </button>
      </span>
    </div>
  </div>
</template>
