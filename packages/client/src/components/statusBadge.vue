<script setup lang="ts">
defineProps<{ active: boolean }>();
</script>

<template>
  <span
    :class="[
      active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
    ]"
  >
    {{ active ? 'Aktywny' : 'Nieaktywny' }}
  </span>
</template>
