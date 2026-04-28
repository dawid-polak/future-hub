<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <Dialog :open="open" @close="emit('cancel')" class="relative z-50">
    <div class="fixed inset-0 bg-black/30" aria-hidden="true" />
    <div class="fixed inset-0 flex items-center justify-center p-4">
      <DialogPanel class="mx-auto max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <div class="flex items-start gap-4">
          <ExclamationTriangleIcon
            :class="[
              variant === 'danger' ? 'text-red-500' : 'text-yellow-500',
              'h-6 w-6 flex-shrink-0 mt-0.5',
            ]"
          />
          <div>
            <DialogTitle class="text-lg font-semibold text-gray-900">{{ title }}</DialogTitle>
            <p class="mt-2 text-sm text-gray-500">{{ message }}</p>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button
            @click="emit('cancel')"
            class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Anuluj
          </button>
          <button
            @click="emit('confirm')"
            :class="[
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-yellow-600 hover:bg-yellow-700',
              'rounded-md px-4 py-2 text-sm font-medium text-white',
            ]"
          >
            {{ confirmLabel || 'Potwierdz' }}
          </button>
        </div>
      </DialogPanel>
    </div>
  </Dialog>
</template>
