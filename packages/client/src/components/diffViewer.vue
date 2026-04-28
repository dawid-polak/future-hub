<script setup lang="ts">
import { computed } from 'vue';
import { diffLines } from 'diff';

const props = defineProps<{
  oldContent: string;
  newContent: string;
  oldLabel?: string;
  newLabel?: string;
}>();

const changes = computed(() => diffLines(props.oldContent, props.newContent));
</script>

<template>
  <div class="rounded-lg border border-gray-300 overflow-hidden">
    <div class="flex border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500">
      <span class="flex-1">{{ oldLabel || 'Stara wersja' }}</span>
      <span class="flex-1">{{ newLabel || 'Nowa wersja' }}</span>
    </div>
    <div class="overflow-auto max-h-[600px] font-mono text-sm">
      <div
        v-for="(part, i) in changes"
        :key="i"
        :class="[
          part.added ? 'bg-green-50 text-green-800' : part.removed ? 'bg-red-50 text-red-800' : 'text-gray-600',
          'px-4 py-0.5 whitespace-pre-wrap border-l-4',
          part.added ? 'border-green-400' : part.removed ? 'border-red-400' : 'border-transparent',
        ]"
      >
        <span class="mr-2 select-none text-gray-400">{{ part.added ? '+' : part.removed ? '-' : ' ' }}</span>{{ part.value }}
      </div>
    </div>
  </div>
</template>
