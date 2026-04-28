<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppSidebar from './components/layout/appSidebar.vue';
import AppHeader from './components/layout/appHeader.vue';

const route = useRoute();
const isPublicRoute = computed(() => route.meta.public);
</script>

<template>
  <div v-if="isPublicRoute" class="min-h-screen">
    <RouterView />
  </div>
  <div v-else class="flex h-screen overflow-hidden">
    <AppSidebar />
    <div class="flex flex-col flex-1 overflow-hidden">
      <AppHeader />
      <main class="flex-1 overflow-y-auto bg-gray-50 p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
