<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '../api/index';
import {
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  CommandLineIcon,
  EnvelopeIcon,
  DocumentTextIcon,
} from '@heroicons/vue/24/outline';

const info = ref<{ companyName: string; apiBase: string } | null>(null);
const loading = ref(true);
const copied = ref<string | null>(null);

onMounted(async () => {
  try {
    const { data } = await api.get('/installer/info');
    info.value = data;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
});

const apiBase = computed(() => info.value?.apiBase || window.location.origin);
const companyName = computed(() => info.value?.companyName || 'FutureHub');

const cmdMac = computed(
  () => `curl -fsSL ${apiBase.value}/api/installer/install.sh | bash`
);
const cmdWin = computed(
  () => `iwr -useb ${apiBase.value}/api/installer/install.ps1 | iex`
);
const onboardingUrl = computed(() => `${apiBase.value}/api/installer/onboarding.md`);
const installShUrl = computed(() => `${apiBase.value}/api/installer/install.sh`);
const installPs1Url = computed(() => `${apiBase.value}/api/installer/install.ps1`);

const emailTemplate = computed(
  () => `Witaj w ${companyName.value}!

Twoje dane logowania:
  Email:   <wpisz email pracownika>
  Haslo:   <wpisz haslo pracownika>

KROK 1 — Skopiuj instrukcje dla swojego asystenta AI:
${onboardingUrl.value}

Otworz powyzszy link w przegladarce, zaznacz cala tresc (Ctrl+A) i wklej jako pierwsza wiadomosc do Claude.

KROK 2 — Asystent poprowadzi Cie przez instalacje. Bedzie potrzebowal:
  - jednego polecenia w terminalu (poda je),
  - Twojego emaila i hasla (mozesz mu je przekazac),

KROK 3 — Po instalacji znajdziesz swoj katalog roboczy w:
  ~/${companyName.value}/

Znajda sie tam wszystkie skille i dokumenty firmy ${companyName.value}, do ktorych masz dostep.
Aktualizuja sie automatycznie co 10 minut.

Powodzenia!
`
);

async function copy(label: string, text: string) {
  try {
    await navigator.clipboard.writeText(text);
    copied.value = label;
    setTimeout(() => {
      if (copied.value === label) copied.value = null;
    }, 2000);
  } catch {
    // fallback dla starych przeglądarek
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    copied.value = label;
    setTimeout(() => {
      if (copied.value === label) copied.value = null;
    }, 2000);
  }
}
</script>

<template>
  <div class="max-w-5xl">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Instalacja u pracownika</h1>
      <p class="mt-2 text-sm text-gray-600">
        Materiały do udostępnienia pracownikowi — komendy instalacyjne, instrukcja dla agenta AI oraz gotowy szablon e-maila.
      </p>
    </div>

    <div v-if="loading" class="text-gray-500">Ładuję…</div>

    <div v-else class="space-y-6">
      <!-- Krok 1: Założ pracownika -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span class="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary-100 text-primary-700 text-sm font-bold">1</span>
          Załóż pracownikowi konto i przypisz role
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          W zakładce <RouterLink to="/users" class="text-primary-600 hover:underline">Użytkownicy</RouterLink>
          stwórz konto pracownika (email + hasło). W zakładce
          <RouterLink to="/roles" class="text-primary-600 hover:underline">Role</RouterLink>
          przypisz mu rolę z odpowiednim zestawem skili. Pracownik dostanie tylko te skille, które zawierają jego role.
        </p>
      </div>

      <!-- Krok 2: Komendy instalacyjne -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span class="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary-100 text-primary-700 text-sm font-bold">2</span>
          <CommandLineIcon class="h-5 w-5" /> Komendy instalacyjne
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          Pracownik wkleja jedną z poniższych komend w terminal i podaje swój email + hasło.
        </p>

        <div class="mt-4 space-y-4">
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-semibold text-gray-700 uppercase">macOS / Linux (terminal)</span>
              <button
                @click="copy('mac', cmdMac)"
                class="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800"
              >
                <CheckIcon v-if="copied === 'mac'" class="h-4 w-4" />
                <ClipboardDocumentIcon v-else class="h-4 w-4" />
                {{ copied === 'mac' ? 'Skopiowano' : 'Kopiuj' }}
              </button>
            </div>
            <pre class="bg-gray-900 text-gray-100 rounded p-3 text-xs overflow-x-auto"><code>{{ cmdMac }}</code></pre>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-semibold text-gray-700 uppercase">Windows (PowerShell)</span>
              <button
                @click="copy('win', cmdWin)"
                class="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800"
              >
                <CheckIcon v-if="copied === 'win'" class="h-4 w-4" />
                <ClipboardDocumentIcon v-else class="h-4 w-4" />
                {{ copied === 'win' ? 'Skopiowano' : 'Kopiuj' }}
              </button>
            </div>
            <pre class="bg-gray-900 text-gray-100 rounded p-3 text-xs overflow-x-auto"><code>{{ cmdWin }}</code></pre>
          </div>
        </div>

        <p class="mt-3 text-xs text-gray-500">
          Skrypt: utworzy katalog <code class="bg-gray-100 px-1 rounded">~/{{ companyName }}/</code> z podkatalogami
          <code class="bg-gray-100 px-1 rounded">skills/</code> i <code class="bg-gray-100 px-1 rounded">docs/</code>,
          zainstaluje CLI <code class="bg-gray-100 px-1 rounded">fh</code>, włączy auto-sync co 10 min.
        </p>
      </div>

      <!-- Krok 3: Onboarding dla agenta AI -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span class="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary-100 text-primary-700 text-sm font-bold">3</span>
          <DocumentTextIcon class="h-5 w-5" /> Instrukcja dla agenta AI (onboarding.md)
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          Pracownik otwiera URL, kopiuje całą zawartość i wkleja jako pierwszą wiadomość do Claude. Agent
          poprowadzi go przez instalację i wskaże, gdzie szukać skili.
        </p>

        <div class="mt-4 flex flex-wrap gap-3">
          <a
            :href="onboardingUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
          >
            <DocumentTextIcon class="h-4 w-4" />
            Otwórz instrukcję
          </a>
          <button
            @click="copy('onb', onboardingUrl)"
            class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
          >
            <CheckIcon v-if="copied === 'onb'" class="h-4 w-4" />
            <ClipboardDocumentIcon v-else class="h-4 w-4" />
            {{ copied === 'onb' ? 'Skopiowano' : 'Kopiuj URL' }}
          </button>
        </div>
      </div>

      <!-- Krok 4: Email szablon -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span class="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary-100 text-primary-700 text-sm font-bold">4</span>
          <EnvelopeIcon class="h-5 w-5" /> Szablon e-maila do pracownika
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          Skopiuj treść poniżej, podstaw email + hasło pracownika i wyślij.
        </p>

        <div class="mt-4">
          <div class="flex justify-end mb-1">
            <button
              @click="copy('mail', emailTemplate)"
              class="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800"
            >
              <CheckIcon v-if="copied === 'mail'" class="h-4 w-4" />
              <ClipboardDocumentIcon v-else class="h-4 w-4" />
              {{ copied === 'mail' ? 'Skopiowano' : 'Kopiuj e-mail' }}
            </button>
          </div>
          <pre class="bg-gray-50 border border-gray-200 rounded p-4 text-xs whitespace-pre-wrap font-mono">{{ emailTemplate }}</pre>
        </div>
      </div>

      <!-- Linki bezpośrednie -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ArrowDownTrayIcon class="h-5 w-5" /> Bezpośrednie linki
        </h2>
        <dl class="mt-3 grid grid-cols-1 gap-2 text-sm">
          <div class="flex items-center justify-between gap-3 py-2 border-b border-gray-100">
            <dt class="text-gray-600">Skrypt instalacyjny — macOS / Linux</dt>
            <dd class="font-mono text-xs text-gray-900 break-all flex items-center gap-2">
              <a :href="installShUrl" target="_blank" class="text-primary-600 hover:underline">{{ installShUrl }}</a>
              <button @click="copy('sh', installShUrl)" class="text-gray-400 hover:text-gray-700">
                <CheckIcon v-if="copied === 'sh'" class="h-4 w-4" />
                <ClipboardDocumentIcon v-else class="h-4 w-4" />
              </button>
            </dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-2 border-b border-gray-100">
            <dt class="text-gray-600">Skrypt instalacyjny — Windows</dt>
            <dd class="font-mono text-xs text-gray-900 break-all flex items-center gap-2">
              <a :href="installPs1Url" target="_blank" class="text-primary-600 hover:underline">{{ installPs1Url }}</a>
              <button @click="copy('ps1', installPs1Url)" class="text-gray-400 hover:text-gray-700">
                <CheckIcon v-if="copied === 'ps1'" class="h-4 w-4" />
                <ClipboardDocumentIcon v-else class="h-4 w-4" />
              </button>
            </dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-2">
            <dt class="text-gray-600">Onboarding dla agenta AI</dt>
            <dd class="font-mono text-xs text-gray-900 break-all flex items-center gap-2">
              <a :href="onboardingUrl" target="_blank" class="text-primary-600 hover:underline">{{ onboardingUrl }}</a>
              <button @click="copy('onb2', onboardingUrl)" class="text-gray-400 hover:text-gray-700">
                <CheckIcon v-if="copied === 'onb2'" class="h-4 w-4" />
                <ClipboardDocumentIcon v-else class="h-4 w-4" />
              </button>
            </dd>
          </div>
        </dl>
      </div>

      <!-- Cofnięcie dostępu -->
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-5 text-sm text-amber-900">
        <h3 class="font-semibold mb-1">Cofnięcie dostępu pracownikowi</h3>
        <p>
          Wystarczy że odbierzesz mu rolę / dezaktywujesz konto w
          <RouterLink to="/users" class="underline">Użytkownikach</RouterLink>.
          W ciągu 10 min auto-sync usunie pliki skili z dysku pracownika. Jeśli całkowicie zdezaktywujesz
          konto — refresh token przestanie działać i CLI wyczyści cały katalog.
        </p>
      </div>
    </div>
  </div>
</template>
