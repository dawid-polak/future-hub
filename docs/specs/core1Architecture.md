# FutureHub — Core 1: Zarzadzanie skillami i uzytkownikami

## Spis tresci

1. [Opis Core 1](#1-opis-core-1)
2. [Skille](#2-skille)
3. [Uzytkownicy](#3-uzytkownicy)
4. [Role](#4-role)
5. [Analityka](#5-analityka)
6. [Modele danych (MongoDB)](#6-modele-danych-mongodb)
7. [REST API — endpointy Core 1](#7-rest-api--endpointy-core-1)
8. [System uprawnien (RBAC)](#8-system-uprawnien-rbac)
9. [Bezpieczenstwo](#9-bezpieczenstwo)
10. [MCP Server — metody Core 1](#10-mcp-server--metody-core-1)
11. [Frontend — widoki Core 1](#11-frontend--widoki-core-1)
12. [Struktura projektu (Core 1)](#12-struktura-projektu-core-1)
13. [Stos technologiczny](#13-stos-technologiczny)
14. [Plan realizacji — Faza 1](#14-plan-realizacji--faza-1)

---

## 1. Opis Core 1

Core 1 to fundament FutureHub — odpowiada za centralne zarzadzanie skillami, uzytkownikami i rolami. Bazuje bezposrednio na architekturze SkillHub (Dawid).

Glowne funkcje:
- CRUD skilli z wersjonowaniem i rollbackiem
- Zarzadzanie uzytkownikami (admin + pracownicy)
- System rol (RBAC) — grupowanie skilli i kontrola dostepu
- Dystrybucja skilli do narzedzi AI przez MCP Server
- Analityka uzycia skilli

---

## 2. Skille

**Skill** to jednostka wiedzy/instrukcji dostarczana do narzedzia AI. Moze zawierac:
- Tresc markdown (prompt, instrukcja, kontekst)
- Zalaczone pliki (szablony, przyklady, referencje)
- Definicje custom MCP tools (nazwa, opis, input schema, handler)

Kazdy skill jest **wersjonowany**. Edycja tresci tworzy nowa wersje (`SkillVersion`). Skill zawsze wskazuje na `currentVersion`. Admin moze:
- Przegladac historie wersji
- Porownywac wersje (diff markdown)
- Przywracac poprzednia wersje (rollback — kopiuje stara wersje jako nowa, nie nadpisuje historii)

Skille sa **kategoryzowane** (np. "frontend", "devops", "testing") i **tagowane** dla latwego wyszukiwania.

---

## 3. Uzytkownicy

Dwa typy uzytkownikow:
- **Admin**: Pelny dostep do dashboardu, CRUD na wszystkich zasobach
- **Pracownik (User)**: Dostep tylko przez MCP (narzedzie AI), widzi tylko skille przypisane do swoich rol

Admin tworzy konta pracownikow i generuje dla nich **API keys** (do autentykacji MCP). API key jest pokazywany tylko raz przy generowaniu, w bazie przechowywany jako hash.

---

## 4. Role

Role to mechanizm grupowania skilli. Przyklad:
- Rola "frontend-dev" → skille: "Vue Component Generator", "CSS Best Practices", "TypeScript Conventions"
- Rola "devops" → skille: "Docker Compose Helper", "CI/CD Pipeline", "Monitoring Setup"
- Rola "manager" → skille: "Code Review Checklist", "Sprint Planning"

Pracownik moze miec wiele rol. Widzi unie skilli ze wszystkich swoich rol.

---

## 5. Analityka

System loguje kazde pobranie skilla przez MCP (kto, kiedy, jaki skill, jaka wersja). Dashboard analityczny pokazuje:
- Top uzywane skille
- Aktywni uzytkownicy
- Trendy uzycia w czasie
- Aktywnosc per uzytkownik

---

## 6. Modele danych (MongoDB)

### User
```typescript
interface IUser {
  _id: ObjectId;
  email: string;
  name: string;
  passwordHash: string;        // bcrypt — tylko dla adminow logujacych sie do panelu
  roles: ObjectId[];            // referencje do Role
  isAdmin: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Role
```typescript
interface IRole {
  _id: ObjectId;
  name: string;                 // np. "frontend-dev", "devops", "manager"
  description: string;
  skills: ObjectId[];           // skille przypisane do tej roli
  agents: ObjectId[];           // agenty przypisane do tej roli (Core 2)
  createdAt: Date;
  updatedAt: Date;
}
```

### Skill
```typescript
interface ISkill {
  _id: ObjectId;
  name: string;                 // np. "Vue Component Generator"
  slug: string;                 // url-friendly identyfikator
  description: string;
  category: string;             // np. "frontend", "devops", "testing"
  tags: string[];
  currentVersion: number;       // numer aktualnej wersji
  isActive: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

### SkillVersion
```typescript
interface ISkillVersion {
  _id: ObjectId;
  skillId: ObjectId;            // referencja do Skill
  version: number;              // 1, 2, 3...
  content: string;              // tresc markdown (prompt/instrukcja)
  files: ISkillFile[];          // zalaczone pliki
  toolDefinitions?: IMcpTool[]; // opcjonalne definicje MCP tools
  changelog: string;            // opis zmian w tej wersji
  createdBy: ObjectId;
  createdAt: Date;
}

interface ISkillFile {
  filename: string;
  path: string;                 // sciezka w storage
  mimeType: string;
  size: number;
}

interface IMcpTool {
  name: string;
  description: string;
  inputSchema: object;          // JSON Schema
  handler: string;              // kod handlera lub referencja
}
```

### ApiKey
```typescript
interface IApiKey {
  _id: ObjectId;
  userId: ObjectId;
  key: string;                  // hash klucza (sam klucz pokazany tylko raz)
  prefix: string;               // pierwsze 8 znakow do identyfikacji (np. "sk_abc123")
  name: string;                 // np. "Laptop biurowy"
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}
```

### UsageLog
```typescript
interface IUsageLog {
  _id: ObjectId;
  userId: ObjectId;
  skillId: ObjectId;
  skillVersion: number;
  action: 'fetch' | 'execute' | 'list';
  apiKeyId: ObjectId;
  ip: string;
  userAgent: string;
  timestamp: Date;
}
```

### Diagram relacji (Core 1)

```
┌──────────┐     N:M      ┌──────────┐     N:M      ┌──────────┐
│   User   │─────────────▶│   Role   │─────────────▶│  Skill   │
│          │  user.roles   │          │  role.skills  │          │
└──────────┘               └──────────┘               └──────────┘
     │                                                      │
     │ 1:N                                                  │ 1:N
     ▼                                                      ▼
┌──────────┐                                         ┌──────────────┐
│  ApiKey  │                                         │ SkillVersion │
└──────────┘                                         └──────────────┘

     ┌──────────┐
     │ UsageLog │  (loguje kazde pobranie skilla)
     └──────────┘
```

---

## 7. REST API — endpointy Core 1

### Autentykacja (JWT)

| Method | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/auth/login` | Login admina (email + haslo -> JWT) |
| POST | `/api/auth/refresh` | Odswiezenie tokena |
| GET | `/api/auth/me` | Profil zalogowanego uzytkownika |

### Users (Admin only)

| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/users` | Lista uzytkownikow (paginacja, filtrowanie) |
| POST | `/api/users` | Dodanie nowego uzytkownika |
| GET | `/api/users/:id` | Szczegoly uzytkownika |
| PUT | `/api/users/:id` | Edycja uzytkownika |
| DELETE | `/api/users/:id` | Deaktywacja uzytkownika |
| POST | `/api/users/:id/api-keys` | Wygenerowanie API key |
| DELETE | `/api/users/:id/api-keys/:keyId` | Uniewaznienie API key |

### Roles (Admin only)

| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/roles` | Lista rol |
| POST | `/api/roles` | Utworzenie roli |
| PUT | `/api/roles/:id` | Edycja roli (w tym przypisanie skilli i agentow) |
| DELETE | `/api/roles/:id` | Usuniecie roli |

### Skills (Admin only)

| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/skills` | Lista skilli (paginacja, filtrowanie, sortowanie) |
| POST | `/api/skills` | Utworzenie skilla |
| GET | `/api/skills/:id` | Szczegoly skilla z aktualna wersja |
| PUT | `/api/skills/:id` | Edycja metadanych skilla |
| DELETE | `/api/skills/:id` | Deaktywacja skilla |
| POST | `/api/skills/:id/versions` | Publikacja nowej wersji |
| GET | `/api/skills/:id/versions` | Lista wersji skilla |
| GET | `/api/skills/:id/versions/:ver` | Konkretna wersja |
| POST | `/api/skills/:id/rollback/:ver` | Rollback do wersji |
| POST | `/api/skills/:id/files` | Upload pliku do skilla |

### Analytics (Admin only)

| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/analytics/dashboard` | Podsumowanie (top skille, aktywni uzytkownicy) |
| GET | `/api/analytics/skills/:id/usage` | Statystyki uzycia skilla |
| GET | `/api/analytics/users/:id/activity` | Aktywnosc uzytkownika |

---

## 8. System uprawnien (RBAC)

```
Admin
 ├── Pelny dostep do dashboardu (Vue 3 SPA)
 ├── CRUD: Users, Roles, Skills
 ├── Generowanie/uniewaznianie API keys
 ├── Dostep do analityki
 └── Definiowanie agentow i przypisywanie do rol

Pracownik (User)
 ├── Ma przypisane role (np. "frontend-dev", "devops")
 ├── Widzi TYLKO skille przypisane do swoich rol
 ├── Dostep wylacznie przez API key + MCP Server
 └── Nie ma dostepu do dashboardu
```

### Logika dostepu — skille

```
getUserSkills(userId):
  user = User.findById(userId).populate('roles')
  roleIds = user.roles.map(r => r._id)
  roles = Role.find({ _id: { $in: roleIds } })
  skillIds = deduplicate(roles.flatMap(r => r.skills))
  return Skill.find({ _id: { $in: skillIds }, isActive: true })
```

---

## 9. Bezpieczenstwo

### Autentykacja

| Mechanizm | Dla kogo | Jak dziala |
|-----------|----------|------------|
| **JWT** | Admin (dashboard) | Login email+haslo -> access token (15min) + refresh token (7d) |
| **API Key** | Pracownik (MCP) | `Authorization: Bearer sk_...` -> hash lookup w bazie |

### Szyfrowanie

| Co | Jak | Gdzie klucz |
|----|-----|-------------|
| Hasla uzytkownikow | bcrypt (12 rounds) | N/A (one-way hash) |
| API keys uzytkownikow | bcrypt | N/A (one-way hash, prefix do identyfikacji) |

### Dodatkowe zabezpieczenia

- **Rate limiting**: Per API key, konfigurowalny (np. 100 req/min)
- **CORS**: Ograniczony do domeny dashboardu
- **Helmet**: Standardowe HTTP security headers
- **Input validation**: express-validator na kazdym endpoincie
- **Audit log**: Kazda zmiana admina logowana z userId, timestamp, action

---

## 10. MCP Server — metody Core 1

| Metoda MCP | Opis |
|------------|------|
| `skills/list` | Lista skilli dostepnych dla uzytkownika (na podstawie jego rol) |
| `skills/get` | Pobranie tresci skilla (markdown + metadane) |
| `skills/files` | Pobranie plikow zalaczonych do skilla |
| `tools/list` | Lista custom tools zdefiniowanych w skillach uzytkownika |
| `tools/call` | Wywolanie custom toola |

### Autentykacja MCP

API key w headerze: `Authorization: Bearer sk_...`

Serwer:
1. Waliduje API key (porownuje hash z baza)
2. Identyfikuje uzytkownika
3. Pobiera role uzytkownika
4. Filtruje zasoby na podstawie rol (RBAC)

### Przeplyw MCP — od polaczenia do odpowiedzi

```
Claude Code (pracownik)
    │
    │  MCP request: skills/list
    │  Header: Authorization: Bearer sk_abc123...
    │
    ▼
FutureHub MCP Server
    │
    ├── 1. apiKeyAuth middleware
    │       → hash(sk_abc123) → lookup w ApiKeys
    │       → znaleziony → userId = "user_xyz"
    │
    ├── 2. getUserSkills(userId)
    │       → User.findById("user_xyz").populate('roles')
    │       → roles = ["frontend-dev", "testing"]
    │       → Role.find({ _id: { $in: roleIds } })
    │       → skillIds = union of roles.skills
    │       → Skill.find({ _id: { $in: skillIds }, isActive: true })
    │
    ├── 3. Formatowanie odpowiedzi MCP
    │       → lista skilli z name, description, category
    │
    ▼
Claude Code otrzymuje liste skilli
    → Wyswietla jako dostepne resources/tools
    → Pracownik moze uzyc dowolnego skilla
```

---

## 11. Frontend — widoki Core 1

### Nawigacja (sidebar — sekcja Core 1)

```
── CORE 1 ──
Skills
Users
Roles
```

### Widoki

| Widok | Funkcjonalnosc |
|-------|----------------|
| **Dashboard** | Podsumowanie: liczba skilli, uzytkownikow + top skille + ostatnia aktywnosc |
| **SkillList** | Tabela skilli z paginacja, filtrowanie po kategorii/tagach, szybkie akcje |
| **SkillEditor** | Edytor markdown (split view: edycja / podglad), upload plikow, definicja tools |
| **SkillVersions** | Lista wersji, diff viewer (porownanie dwoch wersji), przycisk rollback |
| **UserList** | Tabela uzytkownikow, status (aktywny/nieaktywny), przypisane role |
| **UserEdit** | Formularz edycji + zarzadzanie API keys (generowanie, uniewaznianie) |
| **RoleList** | Lista rol z liczba przypisanych skilli i uzytkownikow |
| **RoleEdit** | Edycja roli + przypisywanie skilli (checkbox list) |

### Komponenty wspolne

| Komponent | Uzycie |
|-----------|--------|
| `MarkdownEditor.vue` | Edycja skilli |
| `DiffViewer.vue` | Porownywanie wersji skilli |
| `FileUploader.vue` | Upload plikow do skilli |
| `StatsChart.vue` | Wykresy analityki (wrapper na chart.js) |
| `ConfirmDialog.vue` | Potwierdzenie destrukcyjnych akcji |
| `StatusBadge.vue` | Badge aktywnosci (aktywny/nieaktywny) |

---

## 12. Struktura projektu (Core 1)

```
packages/
├── server/
│   └── src/
│       ├── index.ts
│       ├── config/
│       │   └── index.ts
│       ├── models/
│       │   ├── User.ts
│       │   ├── Role.ts
│       │   ├── Skill.ts
│       │   ├── SkillVersion.ts
│       │   ├── ApiKey.ts
│       │   └── UsageLog.ts
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── users.ts
│       │   ├── roles.ts
│       │   ├── skills.ts
│       │   └── analytics.ts
│       ├── services/
│       │   ├── AuthService.ts
│       │   ├── UserService.ts
│       │   ├── SkillService.ts
│       │   ├── RoleService.ts
│       │   └── UsageService.ts
│       ├── middleware/
│       │   ├── jwtAuth.ts
│       │   ├── apiKeyAuth.ts
│       │   ├── rbac.ts
│       │   └── rateLimiter.ts
│       ├── mcp/
│       │   ├── server.ts
│       │   ├── handlers.ts
│       │   └── tools.ts
│       └── utils/
│           ├── crypto.ts
│           ├── apiKeyGenerator.ts
│           └── logger.ts
│
└── client/
    └── src/
        ├── main.ts
        ├── App.vue
        ├── router/
        │   └── index.ts
        ├── stores/
        │   ├── auth.ts
        │   ├── skills.ts
        │   ├── users.ts
        │   └── roles.ts
        ├── api/
        │   └── index.ts
        ├── views/
        │   ├── Login.vue
        │   ├── Dashboard.vue
        │   ├── Skills/
        │   │   ├── SkillList.vue
        │   │   ├── SkillEditor.vue
        │   │   └── SkillVersions.vue
        │   ├── Users/
        │   │   ├── UserList.vue
        │   │   └── UserEdit.vue
        │   ├── Roles/
        │   │   ├── RoleList.vue
        │   │   └── RoleEdit.vue
        │   └── Analytics/
        │       └── AnalyticsDashboard.vue
        └── components/
            ├── layout/
            │   ├── AppSidebar.vue
            │   ├── AppHeader.vue
            │   └── AppBreadcrumb.vue
            ├── MarkdownEditor.vue
            ├── DiffViewer.vue
            ├── FileUploader.vue
            ├── StatsChart.vue
            ├── ConfirmDialog.vue
            └── StatusBadge.vue
```

---

## 13. Stos technologiczny

### Backend

| Biblioteka | Wersja | Zastosowanie |
|-----------|--------|-------------|
| `express` | 4.x | HTTP server |
| `mongoose` | 8.x | ODM dla MongoDB |
| `typescript` | 5.x | Type safety |
| `jsonwebtoken` | 9.x | JWT tokeny (access + refresh) |
| `bcrypt` | 5.x | Hashowanie hasel i API keys |
| `@modelcontextprotocol/sdk` | latest | Implementacja MCP Server |
| `multer` | 1.x | Upload plikow (skille) |
| `express-validator` | 7.x | Walidacja inputu |
| `express-rate-limit` | 7.x | Rate limiting |
| `helmet` | 7.x | HTTP security headers |
| `cors` | 2.x | CORS middleware |
| `winston` | 3.x | Structured logging |
| `dotenv` | 16.x | Env variables |

### Frontend

| Biblioteka | Wersja | Zastosowanie |
|-----------|--------|-------------|
| `vue` | 3.x | Framework (Composition API + `<script setup>`) |
| `vuetify` | 3.x | UI components (Material Design 3) |
| `pinia` | 2.x | State management |
| `vue-router` | 4.x | Routing |
| `vite` | 5.x | Build tool + dev server |
| `axios` | 1.x | HTTP client |
| `chart.js` + `vue-chartjs` | 4.x | Wykresy analityki |
| `marked` | latest | Rendering markdown (podglad skilli) |
| `diff` | latest | Porownywanie wersji skilli (diff viewer) |

### Infrastruktura

| Narzedzie | Zastosowanie |
|-----------|-------------|
| MongoDB 7+ | Baza danych |
| Docker + Docker Compose | Konteneryzacja (MongoDB + app) |
| Node.js 20+ | Runtime |
| nginx (opcjonalnie) | Reverse proxy + SSL termination |

---

## 14. Plan realizacji — Faza 1

- [ ] Setup monorepo (npm workspaces) + Docker Compose (MongoDB)
- [ ] Backend: Express + TypeScript, config, entry point
- [ ] Modele MongoDB: User, Role, Skill, SkillVersion, ApiKey, UsageLog
- [ ] Middleware: JWT auth, API key auth, RBAC
- [ ] REST API: Auth (login, refresh, me)
- [ ] REST API: Users CRUD + generowanie API keys
- [ ] REST API: Roles CRUD
- [ ] REST API: Skills CRUD + wersjonowanie + rollback
- [ ] MCP Server: skills/list, skills/get, tools/list, tools/call
- [ ] Frontend: Vue 3 + Vuetify 3 + Pinia + Router setup
- [ ] Frontend: Login, Dashboard, SkillList, SkillEditor, UserList, UserEdit, RoleList, RoleEdit
- [ ] Script: seed.ts (admin + sample data)
- [ ] Docker Compose: pelny deployment
