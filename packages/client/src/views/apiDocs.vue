<script setup lang="ts">
import { ref, computed } from 'vue';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue';
import { ChevronRightIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/vue/24/outline';

const copiedId = ref('');
const activeSection = ref('auth');

function copy(text: string, id: string) {
  navigator.clipboard.writeText(text);
  copiedId.value = id;
  setTimeout(() => { copiedId.value = ''; }, 2000);
}

const baseUrl = computed(() => window.location.origin);

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  auth: 'JWT' | 'API Key' | 'Brak';
  body?: Record<string, string>;
  response?: string;
}

interface Section {
  id: string;
  name: string;
  description: string;
  endpoints: Endpoint[];
}

const sections: Section[] = [
  {
    id: 'setup',
    name: 'Setup',
    description: 'Konfiguracja poczatkowa — polaczenie z baza i tworzenie admina',
    endpoints: [
      {
        method: 'GET', path: '/api/setup/status', auth: 'Brak',
        description: 'Sprawdza status konfiguracji (czy baza polaczona, czy admin istnieje)',
        response: '{ "configured": true, "hasAdmin": true, "dbState": 1 }',
      },
      {
        method: 'POST', path: '/api/setup/test-connection', auth: 'Brak',
        description: 'Testuje polaczenie z MongoDB bez zapisywania',
        body: { host: 'string (wymagane)', port: 'number (wymagane)', database: 'string (wymagane)', username: 'string', password: 'string' },
        response: '{ "success": true, "message": "Polaczenie udane" }',
      },
      {
        method: 'POST', path: '/api/setup/save', auth: 'Brak',
        description: 'Zapisuje konfiguracje MongoDB do .env i nawiazuje polaczenie',
        body: { host: 'string (wymagane)', port: 'number (wymagane)', database: 'string (wymagane)', username: 'string', password: 'string' },
      },
      {
        method: 'POST', path: '/api/setup/create-admin', auth: 'Brak',
        description: 'Tworzy pierwsze konto administratora (blokowane jesli admin juz istnieje)',
        body: { name: 'string (wymagane)', email: 'string (wymagane)', password: 'string (min. 6 znakow)' },
      },
      {
        method: 'GET', path: '/api/setup/db-info', auth: 'JWT',
        description: 'Informacje o polaczeniu z baza (host, wersja, rozmiar, uptime)',
        response: '{ "connected": true, "host": "mongo3.small.pl", "name": "mo1315_futureHub", "serverVersion": "7.0", "collections": 8, "documents": 150 }',
      },
      {
        method: 'GET', path: '/api/setup/export', auth: 'JWT',
        description: 'Eksport calej bazy danych do pliku JSON (uzytkownicy, role, skille, wersje, foldery, logi)',
        response: '{ "exportedAt": "...", "collections": { "users": [...], "roles": [...], ... }, "stats": { "users": 5, ... } }',
      },
    ],
  },
  {
    id: 'auth',
    name: 'Autentykacja',
    description: 'Logowanie, odswiezanie tokenow, profil uzytkownika',
    endpoints: [
      {
        method: 'POST', path: '/api/auth/login', auth: 'Brak',
        description: 'Logowanie — zwraca access token (15min) i refresh token (7d)',
        body: { email: 'string (wymagane)', password: 'string (wymagane)' },
        response: '{ "accessToken": "eyJ...", "refreshToken": "eyJ...", "user": { ... } }',
      },
      {
        method: 'POST', path: '/api/auth/refresh', auth: 'Brak',
        description: 'Odswiezenie tokenow',
        body: { refreshToken: 'string (wymagane)' },
        response: '{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }',
      },
      {
        method: 'GET', path: '/api/auth/me', auth: 'JWT',
        description: 'Profil zalogowanego uzytkownika z przypisanymi rolami',
        response: '{ "_id": "...", "email": "...", "name": "...", "roles": [...], "isAdmin": true }',
      },
    ],
  },
  {
    id: 'users',
    name: 'Uzytkownicy',
    description: 'CRUD uzytkownikow + zarzadzanie kluczami API (tylko admin)',
    endpoints: [
      {
        method: 'GET', path: '/api/users', auth: 'JWT',
        description: 'Lista uzytkownikow z paginacja. Query params: page, limit, search, isActive',
        response: '{ "users": [...], "total": 25, "page": 1, "limit": 20, "pages": 2 }',
      },
      {
        method: 'POST', path: '/api/users', auth: 'JWT',
        description: 'Utworzenie nowego uzytkownika',
        body: { email: 'string (wymagane)', name: 'string (wymagane)', password: 'string (min. 6)', roles: 'string[] (ObjectId)', isAdmin: 'boolean' },
      },
      {
        method: 'GET', path: '/api/users/:id', auth: 'JWT',
        description: 'Szczegoly uzytkownika z rolami',
      },
      {
        method: 'PUT', path: '/api/users/:id', auth: 'JWT',
        description: 'Edycja uzytkownika (name, email, roles, isAdmin, isActive)',
        body: { name: 'string', email: 'string', roles: 'string[]', isAdmin: 'boolean', isActive: 'boolean' },
      },
      {
        method: 'DELETE', path: '/api/users/:id', auth: 'JWT',
        description: 'Dezaktywacja uzytkownika (soft delete — ustawia isActive: false)',
      },
      {
        method: 'POST', path: '/api/users/:id/apiKeys', auth: 'JWT',
        description: 'Wygenerowanie API key — klucz zwracany tylko raz!',
        body: { name: 'string (wymagane, np. "Laptop biurowy")' },
        response: '{ "raw": "sk_fh_abc123...", "prefix": "sk_fh_abc123", "name": "...", "id": "..." }',
      },
      {
        method: 'GET', path: '/api/users/:id/apiKeys', auth: 'JWT',
        description: 'Lista kluczy API uzytkownika (bez wartosci klucza — tylko prefix)',
      },
      {
        method: 'DELETE', path: '/api/users/:id/apiKeys/:keyId', auth: 'JWT',
        description: 'Uniewaznienie klucza API',
      },
    ],
  },
  {
    id: 'roles',
    name: 'Role',
    description: 'CRUD rol — grupowanie skilli i kontrola dostepu (tylko admin)',
    endpoints: [
      {
        method: 'GET', path: '/api/roles', auth: 'JWT',
        description: 'Lista rol z przypisanymi skillami i liczba uzytkownikow',
      },
      {
        method: 'GET', path: '/api/roles/:id', auth: 'JWT',
        description: 'Szczegoly roli z lista skilli',
      },
      {
        method: 'POST', path: '/api/roles', auth: 'JWT',
        description: 'Utworzenie roli',
        body: { name: 'string (wymagane, unikalne)', description: 'string', skills: 'string[] (ObjectId)' },
      },
      {
        method: 'PUT', path: '/api/roles/:id', auth: 'JWT',
        description: 'Edycja roli (nazwa, opis, przypisane skille)',
        body: { name: 'string', description: 'string', skills: 'string[]' },
      },
      {
        method: 'DELETE', path: '/api/roles/:id', auth: 'JWT',
        description: 'Usuniecie roli — automatycznie odpina ja od wszystkich uzytkownikow',
      },
    ],
  },
  {
    id: 'skills',
    name: 'Skille',
    description: 'CRUD skilli z wersjonowaniem, rollbackiem i uploadem plikow (tylko admin)',
    endpoints: [
      {
        method: 'GET', path: '/api/skills', auth: 'JWT',
        description: 'Lista skilli. Query: page, limit, category, tags (comma-separated), search, sort',
        response: '{ "skills": [...], "total": 10, "page": 1, "limit": 20, "pages": 1 }',
      },
      {
        method: 'POST', path: '/api/skills', auth: 'JWT',
        description: 'Utworzenie skilla z pierwsza wersja (v1)',
        body: { name: 'string (wymagane)', content: 'string markdown (wymagane)', description: 'string', category: 'string', tags: 'string[]', changelog: 'string' },
      },
      {
        method: 'GET', path: '/api/skills/:id', auth: 'JWT',
        description: 'Szczegoly skilla z aktualna wersja (content, files, toolDefinitions)',
      },
      {
        method: 'PUT', path: '/api/skills/:id', auth: 'JWT',
        description: 'Edycja metadanych (nie tworzy nowej wersji)',
        body: { name: 'string', description: 'string', category: 'string', tags: 'string[]', isActive: 'boolean', folder: 'string ObjectId | null' },
      },
      {
        method: 'DELETE', path: '/api/skills/:id', auth: 'JWT',
        description: 'Dezaktywacja skilla (soft delete)',
      },
      {
        method: 'POST', path: '/api/skills/:id/versions', auth: 'JWT',
        description: 'Publikacja nowej wersji — inkrementuje currentVersion',
        body: { content: 'string markdown (wymagane)', changelog: 'string (wymagane)', files: 'ISkillFile[]', toolDefinitions: 'IMcpTool[]' },
      },
      {
        method: 'GET', path: '/api/skills/:id/versions', auth: 'JWT',
        description: 'Lista wszystkich wersji skilla (od najnowszej)',
      },
      {
        method: 'GET', path: '/api/skills/:id/versions/:ver', auth: 'JWT',
        description: 'Konkretna wersja skilla',
      },
      {
        method: 'POST', path: '/api/skills/:id/rollback/:ver', auth: 'JWT',
        description: 'Rollback — kopiuje stara wersje jako nowa (zachowuje historie)',
      },
      {
        method: 'POST', path: '/api/skills/:id/files', auth: 'JWT',
        description: 'Upload plikow do skilla (multipart/form-data, max 10 plikow, 10MB kazdy)',
      },
    ],
  },
  {
    id: 'folders',
    name: 'Foldery',
    description: 'Zarzadzanie folderami skilli z hierarchia i przypisywaniem rol (tylko admin)',
    endpoints: [
      {
        method: 'GET', path: '/api/folders/tree', auth: 'JWT',
        description: 'Pelne drzewo folderow z zagniezdzonymi skillami',
        response: '{ "folders": [{ "_id": "...", "name": "Frontend", "children": [...], "skills": [...], "roles": [...] }], "rootSkills": [...] }',
      },
      {
        method: 'GET', path: '/api/folders', auth: 'JWT',
        description: 'Plaska lista wszystkich folderow',
      },
      {
        method: 'GET', path: '/api/folders/:id', auth: 'JWT',
        description: 'Szczegoly folderu z podfolderami i skillami',
      },
      {
        method: 'POST', path: '/api/folders', auth: 'JWT',
        description: 'Utworzenie folderu',
        body: { name: 'string (wymagane)', description: 'string', parent: 'string ObjectId | null', roles: 'string[] (ObjectId)' },
      },
      {
        method: 'PUT', path: '/api/folders/:id', auth: 'JWT',
        description: 'Edycja folderu (nazwa, opis, folder nadrzedny, role). Wykrywa cykliczne zaleznosci.',
        body: { name: 'string', description: 'string', parent: 'string ObjectId | null', roles: 'string[]' },
      },
      {
        method: 'DELETE', path: '/api/folders/:id', auth: 'JWT',
        description: 'Usuniecie folderu — podfoldery i skille przenoszone do folderu nadrzednego',
      },
      {
        method: 'PUT', path: '/api/folders/skills/:skillId/move', auth: 'JWT',
        description: 'Przeniesienie skilla do innego folderu (lub na poziom glowny)',
        body: { folderId: 'string ObjectId | null' },
      },
    ],
  },
  {
    id: 'analytics',
    name: 'Analityka',
    description: 'Statystyki uzycia skilli i aktywnosc uzytkownikow (tylko admin)',
    endpoints: [
      {
        method: 'GET', path: '/api/analytics/dashboard', auth: 'JWT',
        description: 'Podsumowanie: total skilli/userow/rol, top 10 uzywanych skilli, ostatnie 10 logow. Query: from, to (ISO date)',
        response: '{ "totalSkills": 4, "totalUsers": 2, "totalRoles": 3, "topSkills": [...], "recentLogs": [...] }',
      },
      {
        method: 'GET', path: '/api/analytics/skills/:id/usage', auth: 'JWT',
        description: 'Uzycie konkretnego skilla w czasie. Query: from, to',
        response: '{ "usage": [{ "_id": "2026-04-25", "count": 5 }], "total": 12 }',
      },
      {
        method: 'GET', path: '/api/analytics/users/:id/activity', auth: 'JWT',
        description: 'Aktywnosc uzytkownika — ostatnie 50 akcji. Query: from, to',
        response: '{ "logs": [...], "total": 48 }',
      },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
};

const authColors: Record<string, string> = {
  JWT: 'bg-purple-100 text-purple-700',
  'API Key': 'bg-orange-100 text-orange-700',
  Brak: 'bg-gray-100 text-gray-500',
};

function curlExample(endpoint: Endpoint): string {
  const url = `${baseUrl.value}${endpoint.path}`;
  let cmd = `curl -X ${endpoint.method} "${url}"`;
  if (endpoint.auth === 'JWT') {
    cmd += ` \\\n  -H "Authorization: Bearer <ACCESS_TOKEN>"`;
  } else if (endpoint.auth === 'API Key') {
    cmd += ` \\\n  -H "Authorization: Bearer <API_KEY>"`;
  }
  if (endpoint.body) {
    cmd += ` \\\n  -H "Content-Type: application/json"`;
    const bodyObj: Record<string, string> = {};
    for (const [k, v] of Object.entries(endpoint.body)) {
      bodyObj[k] = v.includes('wymagane') ? `<${k}>` : '';
    }
    cmd += ` \\\n  -d '${JSON.stringify(bodyObj, null, 2)}'`;
  }
  return cmd;
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Dokumentacja API</h1>
        <p class="mt-1 text-sm text-gray-500">
          Base URL: <code class="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono">{{ baseUrl }}</code>
        </p>
      </div>
    </div>

    <!-- Auth info -->
    <div class="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <h3 class="text-sm font-semibold text-blue-800">Autentykacja</h3>
      <div class="mt-2 space-y-1 text-sm text-blue-700">
        <p><span class="font-medium">JWT:</span> Header <code class="rounded bg-blue-100 px-1">Authorization: Bearer &lt;access_token&gt;</code> — uzyskany przez <code>/api/auth/login</code></p>
      </div>
    </div>

    <!-- Navigation tabs -->
    <div class="mt-6 flex flex-wrap gap-1 border-b border-gray-200">
      <button
        v-for="section in sections"
        :key="section.id"
        @click="activeSection = section.id"
        :class="[
          activeSection === section.id
            ? 'border-primary-500 text-primary-600'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
          'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
        ]"
      >
        {{ section.name }}
        <span class="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{{ section.endpoints.length }}</span>
      </button>
    </div>

    <!-- Active section -->
    <template v-for="section in sections" :key="section.id">
      <div v-if="activeSection === section.id" class="mt-4">
        <p class="text-sm text-gray-500 mb-4">{{ section.description }}</p>

        <div class="space-y-3">
          <Disclosure v-for="(ep, i) in section.endpoints" :key="i" v-slot="{ open }">
            <DisclosureButton class="flex w-full items-center gap-3 rounded-lg bg-white px-4 py-3 text-left shadow hover:bg-gray-50 transition-colors">
              <ChevronRightIcon :class="['h-4 w-4 text-gray-400 transition-transform', open && 'rotate-90']" />
              <span :class="[methodColors[ep.method], 'rounded px-2 py-0.5 text-xs font-bold uppercase']">{{ ep.method }}</span>
              <code class="text-sm font-mono text-gray-900">{{ ep.path }}</code>
              <span class="flex-1 text-sm text-gray-500 truncate ml-2">{{ ep.description }}</span>
              <span :class="[authColors[ep.auth], 'rounded-full px-2 py-0.5 text-xs font-medium']">{{ ep.auth }}</span>
            </DisclosureButton>

            <DisclosurePanel class="ml-7 mt-1 rounded-lg border border-gray-200 bg-white p-4">
              <p class="text-sm text-gray-700">{{ ep.description }}</p>

              <!-- Body params -->
              <div v-if="ep.body" class="mt-3">
                <h4 class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Body (JSON)</h4>
                <table class="w-full text-sm">
                  <tbody>
                    <tr v-for="(type, key) in ep.body" :key="key" class="border-t border-gray-100">
                      <td class="py-1.5 pr-4 font-mono text-gray-900">{{ key }}</td>
                      <td class="py-1.5 text-gray-500">{{ type }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Example response -->
              <div v-if="ep.response" class="mt-3">
                <h4 class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Przykladowa odpowiedz</h4>
                <pre class="rounded-md bg-gray-900 p-3 text-xs text-green-400 overflow-x-auto">{{ ep.response }}</pre>
              </div>

              <!-- cURL -->
              <div class="mt-3">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="text-xs font-semibold uppercase tracking-wider text-gray-500">cURL</h4>
                  <button
                    @click="copy(curlExample(ep), `${section.id}-${i}`)"
                    class="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                  >
                    <component :is="copiedId === `${section.id}-${i}` ? CheckIcon : ClipboardDocumentIcon" class="h-3.5 w-3.5" />
                    {{ copiedId === `${section.id}-${i}` ? 'Skopiowane' : 'Kopiuj' }}
                  </button>
                </div>
                <pre class="rounded-md bg-gray-900 p-3 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">{{ curlExample(ep) }}</pre>
              </div>
            </DisclosurePanel>
          </Disclosure>
        </div>
      </div>
    </template>

  </div>
</template>
