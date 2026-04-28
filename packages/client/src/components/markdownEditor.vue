<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { marked } from 'marked';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const mode = ref<'split' | 'edit' | 'preview'>('split');
const content = ref(props.modelValue);

watch(() => props.modelValue, (val) => { content.value = val; });

const rendered = computed(() => marked(content.value || ''));

function onInput(e: Event) {
  const val = (e.target as HTMLTextAreaElement).value;
  content.value = val;
  emit('update:modelValue', val);
}
</script>

<template>
  <div class="rounded-lg border border-gray-300 overflow-hidden">
    <div class="flex items-center gap-1 border-b border-gray-200 bg-gray-50 px-3 py-1.5">
      <button
        v-for="m in (['edit', 'split', 'preview'] as const)"
        :key="m"
        type="button"
        @click="mode = m"
        :class="[
          mode === m ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700',
          'rounded px-3 py-1 text-xs font-medium capitalize transition-colors',
        ]"
      >
        {{ m === 'edit' ? 'Edytor' : m === 'split' ? 'Podzielony' : 'Podglad' }}
      </button>
    </div>
    <div class="flex" :class="mode === 'split' ? 'divide-x divide-gray-200' : ''">
      <textarea
        v-if="mode !== 'preview'"
        :value="content"
        @input="onInput"
        :class="[mode === 'split' ? 'w-1/2' : 'w-full', 'min-h-[400px] resize-y p-4 font-mono text-sm focus:outline-none']"
        placeholder="Wpisz tresc markdown..."
      />
      <div
        v-if="mode !== 'edit'"
        :class="[mode === 'split' ? 'w-1/2' : 'w-full', 'prose prose-sm max-w-none p-4 overflow-auto min-h-[400px]']"
        v-html="rendered"
      />
    </div>
  </div>
</template>
