<script setup lang="ts">
import { useRoute } from 'vue-router';
import {
  RectangleStackIcon,
  UsersIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  HomeIcon,
  CommandLineIcon,
  BookOpenIcon,
  ArrowDownTrayIcon,
} from '@heroicons/vue/24/outline';

const route = useRoute();

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { label: 'CORE 1' },
  { name: 'Skille', href: '/skills', icon: CommandLineIcon },
  { name: 'Uzytkownicy', href: '/users', icon: UsersIcon },
  { name: 'Role', href: '/roles', icon: ShieldCheckIcon },
  { label: 'SYSTEM' },
  { name: 'Analityka', href: '/analytics', icon: ChartBarIcon },
  { name: 'Instalacja u pracownika', href: '/installer-guide', icon: ArrowDownTrayIcon },
  { name: 'Dokumentacja API', href: '/api-docs', icon: BookOpenIcon },
];

function isActive(href: string) {
  if (href === '/') return route.path === '/';
  return route.path.startsWith(href);
}
</script>

<template>
  <aside class="hidden lg:flex lg:flex-shrink-0">
    <div class="flex w-64 flex-col">
      <div class="flex min-h-0 flex-1 flex-col bg-gray-900">
        <div class="flex h-16 flex-shrink-0 items-center px-4">
          <RectangleStackIcon class="h-8 w-8 text-primary-400" />
          <span class="ml-2 text-xl font-bold text-white">FutureHub</span>
        </div>
        <nav class="mt-4 flex-1 space-y-1 px-2">
          <template v-for="item in navigation" :key="item.name || item.label">
            <p v-if="'label' in item" class="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {{ item.label }}
            </p>
            <RouterLink
              v-else
              :to="item.href!"
              :class="[
                isActive(item.href!) ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
              ]"
            >
              <component
                :is="item.icon"
                :class="[
                  isActive(item.href!) ? 'text-primary-400' : 'text-gray-400 group-hover:text-gray-300',
                  'mr-3 h-5 w-5 flex-shrink-0',
                ]"
              />
              {{ item.name }}
            </RouterLink>
          </template>
        </nav>
      </div>
    </div>
  </aside>
</template>
