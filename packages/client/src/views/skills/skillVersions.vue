<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useSkillsStore } from '../../stores/skills';
import DiffViewer from '../../components/diffViewer.vue';
import ConfirmDialog from '../../components/confirmDialog.vue';

const route = useRoute();
const store = useSkillsStore();
const skillId = route.params.id as string;

const selectedVersions = ref<number[]>([]);
const diffContent = ref<{ old: string; new: string } | null>(null);
const rollbackTarget = ref<number | null>(null);

onMounted(async () => {
  await Promise.all([store.fetchSkill(skillId), store.fetchVersions(skillId)]);
});

function toggleVersion(version: number) {
  const idx = selectedVersions.value.indexOf(version);
  if (idx >= 0) {
    selectedVersions.value.splice(idx, 1);
  } else {
    if (selectedVersions.value.length >= 2) selectedVersions.value.shift();
    selectedVersions.value.push(version);
  }
}

async function compareDiff() {
  if (selectedVersions.value.length !== 2) return;
  const [v1, v2] = selectedVersions.value.sort((a, b) => a - b);
  const [old, newer] = await Promise.all([
    store.fetchVersions(skillId).then(() => store.versions.find((v) => v.version === v1)),
    store.versions.find((v) => v.version === v2),
  ]);
  diffContent.value = {
    old: old?.content || '',
    new: newer?.content || '',
  };
}

async function handleRollback() {
  if (rollbackTarget.value !== null) {
    await store.rollback(skillId, rollbackTarget.value);
    rollbackTarget.value = null;
    await store.fetchVersions(skillId);
    await store.fetchSkill(skillId);
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900">
      Wersje: {{ store.currentSkill?.name }}
    </h1>
    <p class="mt-1 text-sm text-gray-500">Aktualna wersja: v{{ store.currentSkill?.currentVersion }}</p>

    <div class="mt-4 flex gap-3">
      <button
        @click="compareDiff"
        :disabled="selectedVersions.length !== 2"
        class="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
      >
        Porownaj zaznaczone
      </button>
    </div>

    <div class="mt-4 overflow-hidden rounded-lg bg-white shadow">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="w-10 px-4 py-3"></th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Wersja</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Changelog</th>
            <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Data</th>
            <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Akcje</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="v in store.versions" :key="v.version" class="hover:bg-gray-50">
            <td class="px-4 py-4">
              <input
                type="checkbox"
                :checked="selectedVersions.includes(v.version)"
                @change="toggleVersion(v.version)"
                class="rounded border-gray-300"
              />
            </td>
            <td class="px-6 py-4 text-sm font-medium text-gray-900">
              v{{ v.version }}
              <span v-if="v.version === store.currentSkill?.currentVersion" class="ml-2 text-xs text-primary-600">(aktualna)</span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ v.changelog }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ new Date(v.createdAt).toLocaleString('pl-PL') }}</td>
            <td class="px-6 py-4 text-right">
              <button
                v-if="v.version !== store.currentSkill?.currentVersion"
                @click="rollbackTarget = v.version"
                class="text-sm text-primary-600 hover:text-primary-800"
              >
                Przywroc
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="diffContent" class="mt-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-3">Porownanie wersji</h3>
      <DiffViewer
        :old-content="diffContent.old"
        :new-content="diffContent.new"
        :old-label="`v${selectedVersions[0]}`"
        :new-label="`v${selectedVersions[1]}`"
      />
    </div>

    <ConfirmDialog
      :open="rollbackTarget !== null"
      title="Przywroc wersje"
      :message="`Czy na pewno chcesz przywrocic wersje v${rollbackTarget}? Zostanie utworzona nowa wersja z ta trescia.`"
      confirm-label="Przywroc"
      variant="warning"
      @confirm="handleRollback"
      @cancel="rollbackTarget = null"
    />
  </div>
</template>
