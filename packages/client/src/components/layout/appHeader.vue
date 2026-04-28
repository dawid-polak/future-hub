<script setup lang="ts">
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue';
import { UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/vue/24/outline';
import { useAuthStore } from '../../stores/auth';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();

async function handleLogout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <header class="flex h-16 flex-shrink-0 border-b border-gray-200 bg-white">
    <div class="flex flex-1 items-center justify-between px-4 sm:px-6">
      <div class="text-sm text-gray-500">
        <!-- breadcrumb placeholder -->
      </div>
      <Menu as="div" class="relative">
        <MenuButton class="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
          <UserCircleIcon class="h-6 w-6 text-gray-400" />
          <span>{{ auth.user?.name || 'Uzytkownik' }}</span>
        </MenuButton>
        <MenuItems class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <MenuItem v-slot="{ active }">
            <button
              @click="handleLogout"
              :class="[active ? 'bg-gray-100' : '', 'flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700']"
            >
              <ArrowRightOnRectangleIcon class="h-4 w-4" />
              Wyloguj sie
            </button>
          </MenuItem>
        </MenuItems>
      </Menu>
    </div>
  </header>
</template>
