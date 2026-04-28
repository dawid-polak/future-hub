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

interface DesktopManifest {
  version: string;
  releasedAt: string | null;
  available: boolean;
  urls: { mac: string | null; win: string | null; linuxAppImage: string | null; linuxDeb: string | null };
  sizes: { mac: number | null; win: number | null; linuxAppImage: number | null; linuxDeb: number | null };
  releaseUrl: string;
}

const info = ref<{ companyName: string; apiBase: string } | null>(null);
const manifest = ref<DesktopManifest | null>(null);
const loading = ref(true);
const copied = ref<string | null>(null);

onMounted(async () => {
  try {
    const [infoRes, manifestRes] = await Promise.all([
      api.get('/installer/info'),
      api.get('/installer/desktop/manifest').catch(() => ({ data: null })),
    ]);
    info.value = infoRes.data;
    manifest.value = manifestRes.data;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
});

const apiBase = computed(() => info.value?.apiBase || window.location.origin);
const companyName = computed(() => info.value?.companyName || 'FutureHub');

const cmdMac = computed(() => `curl -fsSL ${apiBase.value}/api/installer/install.sh | bash`);
const cmdWin = computed(() => `iwr -useb ${apiBase.value}/api/installer/install.ps1 | iex`);
const onboardingUrl = computed(() => `${apiBase.value}/api/installer/onboarding.md`);

const detectedOs = computed<'mac' | 'win' | 'linux' | 'other'>(() => {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mac')) return 'mac';
  if (ua.includes('win')) return 'win';
  if (ua.includes('linux')) return 'linux';
  return 'other';
});

function fmtSize(bytes: number | null): string {
  if (!bytes) return '—';
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1)} MB`;
}

const emailTemplate = computed(
  () => `Witaj w ${companyName.value}!

Twoje dane logowania:
  Email:   <wpisz email pracownika>
  Haslo:   <wpisz haslo pracownika>

KROK 1 — Pobierz aplikację Future Hub Desktop dla swojego systemu:
${apiBase.value}/installer-guide

(Wybierz wersję dla macOS, Windows lub Linux i zainstaluj)

KROK 2 — Po pierwszym uruchomieniu aplikacja pokaże okno logowania.
Wpisz email i hasło które otrzymałeś powyżej.

KROK 3 — Aplikacja działa w tle (ikona w pasku menu / system tray)
i automatycznie synchronizuje skille co 10 minut.

KROK 4 — Skopiuj instrukcje dla swojego asystenta AI:
${onboardingUrl.value}

Otworz powyzszy link w przegladarce, zaznacz cala tresc (Ctrl+A) i wklej
jako pierwsza wiadomosc do Claude.

KROK 5 — Twój katalog roboczy znajdziesz w:
  ~/${companyName.value}/

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
        Materiały do udostępnienia pracownikowi — pobranie aplikacji desktop, instrukcja dla agenta AI, szablon e-maila.
      </p>
    </div>

    <div v-if="loading" class="text-gray-500">Ładuję…</div>

    <div v-else class="space-y-6">
      <!-- Krok 1: Załóż konto -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span class="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary-100 text-primary-700 text-sm font-bold">1</span>
          Załóż pracownikowi konto i przypisz role
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          W zakładce <RouterLink to="/users" class="text-primary-600 hover:underline">Użytkownicy</RouterLink>
          stwórz konto pracownika (email + hasło). W zakładce
          <RouterLink to="/roles" class="text-primary-600 hover:underline">Role</RouterLink>
          przypisz mu rolę z odpowiednim zestawem skili.
        </p>
      </div>

      <!-- Krok 2: Pobranie aplikacji -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span class="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary-100 text-primary-700 text-sm font-bold">2</span>
          <ArrowDownTrayIcon class="h-5 w-5" /> Pobierz aplikację Future Hub Desktop
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          Pracownik pobiera aplikację dla swojego systemu i instaluje. Po pierwszym uruchomieniu loguje się emailem i hasłem.
        </p>

        <div v-if="manifest && !manifest.available" class="mt-4 bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
          Aplikacje desktop nie są jeszcze opublikowane. Pierwsze wydanie pojawi się po push tagu <code class="font-mono">desktop-v1.0.0</code> w GitHub.
          Linki będą dostępne automatycznie. W międzyczasie skorzystaj z trybu CLI poniżej.
        </div>

        <div class="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- macOS card -->
          <div
            :class="[
              'border rounded-lg p-5 flex flex-col',
              detectedOs === 'mac' ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200',
            ]"
          >
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-gray-900">macOS</h3>
              <span v-if="detectedOs === 'mac'" class="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">Twój system</span>
            </div>
            <p class="text-xs text-gray-500">Format: <span class="font-mono">.dmg</span></p>
            <p class="text-xs text-gray-500" v-if="manifest?.version">v{{ manifest.version }} · {{ fmtSize(manifest.sizes.mac) }}</p>
            <p class="text-xs text-gray-400" v-else>—</p>
            <a
              v-if="manifest?.urls.mac"
              :href="manifest.urls.mac"
              class="mt-4 block text-center bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-2 rounded"
            >
              Pobierz dla macOS
            </a>
            <button v-else disabled class="mt-4 block text-center bg-gray-200 text-gray-500 text-sm font-medium py-2 rounded cursor-not-allowed">
              Niedostępne
            </button>
          </div>

          <!-- Windows card -->
          <div
            :class="[
              'border rounded-lg p-5 flex flex-col',
              detectedOs === 'win' ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200',
            ]"
          >
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-gray-900">Windows</h3>
              <span v-if="detectedOs === 'win'" class="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">Twój system</span>
            </div>
            <p class="text-xs text-gray-500">Format: <span class="font-mono">.exe</span> (NSIS)</p>
            <p class="text-xs text-gray-500" v-if="manifest?.version">v{{ manifest.version }} · {{ fmtSize(manifest.sizes.win) }}</p>
            <p class="text-xs text-gray-400" v-else>—</p>
            <a
              v-if="manifest?.urls.win"
              :href="manifest.urls.win"
              class="mt-4 block text-center bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-2 rounded"
            >
              Pobierz dla Windows
            </a>
            <button v-else disabled class="mt-4 block text-center bg-gray-200 text-gray-500 text-sm font-medium py-2 rounded cursor-not-allowed">
              Niedostępne
            </button>
          </div>

          <!-- Linux card -->
          <div
            :class="[
              'border rounded-lg p-5 flex flex-col',
              detectedOs === 'linux' ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200',
            ]"
          >
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-gray-900">Linux</h3>
              <span v-if="detectedOs === 'linux'" class="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">Twój system</span>
            </div>
            <p class="text-xs text-gray-500">Format: <span class="font-mono">AppImage</span> / <span class="font-mono">.deb</span></p>
            <p class="text-xs text-gray-500" v-if="manifest?.version">v{{ manifest.version }} · {{ fmtSize(manifest.sizes.linuxAppImage) }}</p>
            <p class="text-xs text-gray-400" v-else>—</p>
            <div class="mt-4 space-y-2">
              <a
                v-if="manifest?.urls.linuxAppImage"
                :href="manifest.urls.linuxAppImage"
                class="block text-center bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-2 rounded"
              >
                AppImage
              </a>
              <a
                v-if="manifest?.urls.linuxDeb"
                :href="manifest.urls.linuxDeb"
                class="block text-center bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded"
              >
                .deb (Ubuntu/Debian)
              </a>
              <button
                v-if="!manifest?.urls.linuxAppImage && !manifest?.urls.linuxDeb"
                disabled
                class="block w-full text-center bg-gray-200 text-gray-500 text-sm font-medium py-2 rounded cursor-not-allowed"
              >
                Niedostępne
              </button>
            </div>
          </div>
        </div>

        <details class="mt-5 text-sm">
          <summary class="cursor-pointer text-gray-600 hover:text-gray-900 select-none">Zaawansowane: instalacja przez CLI (legacy)</summary>
          <div class="mt-4 space-y-4 pl-2">
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-semibold text-gray-700 uppercase">macOS / Linux</span>
                <button @click="copy('mac', cmdMac)" class="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800">
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
                <button @click="copy('win', cmdWin)" class="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800">
                  <CheckIcon v-if="copied === 'win'" class="h-4 w-4" />
                  <ClipboardDocumentIcon v-else class="h-4 w-4" />
                  {{ copied === 'win' ? 'Skopiowano' : 'Kopiuj' }}
                </button>
              </div>
              <pre class="bg-gray-900 text-gray-100 rounded p-3 text-xs overflow-x-auto"><code>{{ cmdWin }}</code></pre>
            </div>
            <p class="text-xs text-gray-500">
              <CommandLineIcon class="h-3 w-3 inline" /> CLI tworzy ten sam katalog <code class="bg-gray-100 px-1 rounded">~/{{ companyName }}/</code>.
              Aplikacja desktop wykryje istniejącą instalację i przejmie kontrolę.
            </p>
          </div>
        </details>
      </div>

      <!-- Krok 3: Onboarding -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span class="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary-100 text-primary-700 text-sm font-bold">3</span>
          <DocumentTextIcon class="h-5 w-5" /> Instrukcja dla agenta AI (onboarding.md)
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          Pracownik otwiera URL, kopiuje całą zawartość i wkleja jako pierwszą wiadomość do Claude.
        </p>
        <div class="mt-4 flex flex-wrap gap-3">
          <a
            :href="onboardingUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
          >
            <DocumentTextIcon class="h-4 w-4" /> Otwórz instrukcję
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

      <!-- Krok 4: Email -->
      <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span class="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary-100 text-primary-700 text-sm font-bold">4</span>
          <EnvelopeIcon class="h-5 w-5" /> Szablon e-maila do pracownika
        </h2>
        <div class="mt-4">
          <div class="flex justify-end mb-1">
            <button @click="copy('mail', emailTemplate)" class="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800">
              <CheckIcon v-if="copied === 'mail'" class="h-4 w-4" />
              <ClipboardDocumentIcon v-else class="h-4 w-4" />
              {{ copied === 'mail' ? 'Skopiowano' : 'Kopiuj e-mail' }}
            </button>
          </div>
          <pre class="bg-gray-50 border border-gray-200 rounded p-4 text-xs whitespace-pre-wrap font-mono">{{ emailTemplate }}</pre>
        </div>
      </div>

      <!-- Cofnięcie dostępu -->
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-5 text-sm text-amber-900">
        <h3 class="font-semibold mb-1">Cofnięcie dostępu pracownikowi</h3>
        <p>
          Wystarczy że odbierzesz mu rolę / dezaktywujesz konto w
          <RouterLink to="/users" class="underline">Użytkownikach</RouterLink>.
          W ciągu 10 min auto-sync usunie pliki skili z dysku pracownika. Jeśli całkowicie zdezaktywujesz konto — refresh token przestanie działać i aplikacja wyczyści cały katalog.
        </p>
      </div>
    </div>
  </div>
</template>
