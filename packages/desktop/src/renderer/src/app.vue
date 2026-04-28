<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fh } from './api/bridge';

const router = useRouter();

onMounted(async () => {
  // Sprawdź migrację
  const mig = await fh.migration.status();
  if (mig.hasLegacyConfig) {
    if (confirm('Wykryto poprzednią instalację Future Hub (CLI). Aplikacja przejmie synchronizację — zatrzyma cron/launchd, przeniesie token do bezpiecznego magazynu. Kontynuować?')) {
      await fh.migration.run();
    }
  }
  // Routing po stanie auth
  const status = await fh.auth.status();
  if (status.authenticated) {
    void router.push('/dashboard');
  } else {
    void router.push('/login');
  }
});
</script>

<template>
  <div class="h-full flex flex-col">
    <RouterView />
  </div>
</template>
