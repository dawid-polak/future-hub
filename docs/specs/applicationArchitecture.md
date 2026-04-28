# FutureHub — Architektura aplikacji

## Spis tresci

1. [Geneza i kontekst](#1-geneza-i-kontekst)
2. [Wizja produktu](#2-wizja-produktu)
3. [Decyzje architektoniczne](#3-decyzje-architektoniczne)
4. [Architektura systemu](#4-architektura-systemu)
5. [Core 1 — Zarzadzanie skillami i uzytkownikami](#5-core-1--zarzadzanie-skillami-i-uzytkownikami)
6. [Core 2 — Hub agentow AI i orkiestrator konfiguracji](#6-core-2--hub-agentow-ai-i-orkiestrator-konfiguracji)
7. [MCP Server — most miedzy serwerem a narzedziami AI](#7-mcp-server--most-miedzy-serwerem-a-narzedziami-ai)
8. [Modele danych (MongoDB)](#8-modele-danych-mongodb)
9. [REST API — pelna specyfikacja endpointow](#9-rest-api--pelna-specyfikacja-endpointow)
10. [System uprawnien (RBAC)](#10-system-uprawnien-rbac)
11. [Bezpieczenstwo](#11-bezpieczenstwo)
12. [Frontend — Dashboard Vue 3](#12-frontend--dashboard-vue-3)
13. [Struktura projektu (Monorepo)](#13-struktura-projektu-monorepo)
14. [Stos technologiczny](#14-stos-technologiczny)
15. [Konfiguracja klienta (pracownik)](#15-konfiguracja-klienta-pracownik)
16. [Jak FutureHub zastepuje architekture Mikolaja](#16-jak-futurehub-zastepuje-architekture-mikolaja)
17. [Scenariusze uzycia](#17-scenariusze-uzycia)
18. [Deployment i hosting](#18-deployment-i-hosting)
19. [Plan realizacji — fazy](#19-plan-realizacji--fazy)
20. [Ograniczenia i kierunki rozwoju](#20-ograniczenia-i-kierunki-rozwoju)

---

## 1. Geneza i kontekst

### Problem

Firmy korzystajace z narzedzi AI do kodowania (Claude Code, OpenAI Codex CLI, Google Gemini CLI) napotykaja dwa fundamentalne problemy:

**Problem A — Brak centralnego zarzadzania skillami (zidentyfikowany w architekturze Dawida / SkillHub):**
- Skille (instrukcje, prompty, narzedzia) zyja rozrzucone po maszynach pracownikow
- Brak kontroli dostepu — kazdy ma dostep do wszystkiego lub niczego
- Trudnosc w dystrybucji i aktualizacji skilli dla wielu pracownikow
- Brak wersjonowania i analityki uzycia

**Problem B — Fragmentacja konfiguracji miedzy narzedziami AI (zidentyfikowany w architekturze Mikolaja):**
- Kazde narzedzie AI ma wlasne pliki konfiguracyjne, format MCP, lokalizacje skilli
- Edycja w jednym narzedziu nie aktualizuje pozostalych
- Sekrety (tokeny API) rozproszone w wielu plikach plain text
- Brak standardu lokalizacji lokalnych serwerow MCP

### Dwa podejscia zrodlowe

| Aspekt | Architektura Dawid (SkillHub) | Architektura Mikolaj |
|--------|-------------------------------|----------------------|
| **Cel** | Centralne zarzadzanie skillami w firmie, dystrybucja do pracownikow przez MCP | Ujednolicenie konfiguracji miedzy wieloma narzedziami AI |
| **Podejscie** | Aplikacja webowa (serwer + dashboard + DB) | Folder-based + symlinki + generatory (zero serwera) |
| **Skille** | W MongoDB, wersjonowane, z RBAC | W plikach na dysku (~/.agents/skills/), standard AAIF |
| **MCP** | Wlasny MCP Server serwujacy skille | YAML master -> generator do natywnych formatow |
| **Sekrety** | API keys w MongoDB (hash) | OS Keychain, nigdy w plikach |
| **Dystrybucja** | Sieciowa (API key + MCP endpoint) | Lokalna (symlinki + git hooks) |
| **Uzytkownicy** | Multi-user z rolami (RBAC) | Single-user / per-machine |
| **Agenty AI** | Nie adresowane | Konfiguracja wielu narzedzi AI jednoczesnie |

### Decyzja: polaczenie obu podejsc

FutureHub laczy **nadrzedne podejscie Dawida** (aplikacja webowa, serwer jako jedno zrodlo prawdy) z **mozliwosciami architektury Mikolaja** (zarzadzanie wieloma narzedziami AI, konfiguracja MCP, instrukcje), przy czym **cala warstwa lokalna Mikolaja (symlinki, generatory, git hooks, lokalne pliki) zostaje zastapiona serwerem i MCP**.

---

## 2. Wizja produktu

### Czym jest FutureHub

FutureHub to **self-hosted platforma do zarzadzania agentami AI**, ich skillami, narzedziami MCP i konfiguracja. Serwer jest jedynym zrodlem prawdy — narzedzia AI (Claude Code, Codex, Gemini i inne) lacza sie z nim bezposrednio przez protokol MCP.

### Kluczowe zalozenia

- **Dwa core'y**: Zarzadzanie skillami/uzytkownikami (Core 1) + Hub agentow AI (Core 2)
- **Tylko serwer**: Zero lokalnych plikow konfiguracyjnych. Narzedzia AI lacza sie z FutureHub przez MCP
- **Konfiguracja, nie runtime**: Serwer definiuje i serwuje konfiguracje agentow, ale NIE uruchamia ich. Uzytkownik uruchamia agenta lokalnie w swoim narzedziu
- **Self-hosted per klient**: Kazdy klient dostaje wlasna instancje (Docker/VPS). Pelna izolacja danych
- **Docelowo SaaS**: Architektura przygotowana na ewolucje w kierunku publicznego produktu

### Dla kogo

- **Admin (wlasciciel firmy / team lead)**: Tworzy skille, definiuje agentow, przypisuje role, monitoruje uzycie
- **Pracownik / developer**: Laczy swoje narzedzie AI z FutureHub, automatycznie otrzymuje skille i konfiguracje agentow przypisane do swoich rol

---

## 3. Decyzje architektoniczne

### D1: Serwer jako jedyne zrodlo prawdy (zamiast lokalnych plikow)

Architektura Mikolaja opierala sie na lokalnych plikach (`~/.agents/`), symlinkach i generatorach. FutureHub zastepuje to wszystko jednym serwerem. Powody:

- **Zero dryfu**: Nie ma dwoch kopii do synchronizacji (serwer vs lokalne pliki)
- **Multi-user natywnie**: Wielu pracownikow laczy sie z tym samym serwerem
- **RBAC natywnie**: Serwer kontroluje kto co widzi na podstawie rol
- **Zero konfiguracji po stronie pracownika**: Wystarczy jeden wpis MCP w narzedziu AI
- **Wersjonowanie**: Serwer wersjonuje skille automatycznie (w DB), nie trzeba gita

**Co tracimy vs architektura Mikolaja:**
- Brak dzialania offline (wymaga polaczenia z serwerem)
- Zaleznosc od dostepnosci serwera

**Mitygacja**: Cache MCP po stronie klienta (narzedzia AI cachuja odpowiedzi MCP) + opcjonalny tryb offline w przyszlosci.

### D2: MCP jako jedyny interfejs dla narzedzi AI

Zamiast generowac natywne pliki konfiguracyjne per narzedzie (`.mcp.json`, `config.toml`, `settings.json`), FutureHub wystawia jeden MCP Server endpoint. Kazde narzedzie wspierajace MCP (Claude Code, Codex CLI, Gemini CLI, VS Code Copilot, Cursor) laczy sie z tym samym endpointem.

- **Jeden endpoint zamiast pieciu generowanych plikow**
- **Narzedzie-agnostyczny**: Nie musimy znac formatow konfiguracji kazdego narzedzia
- **Natychmiastowa aktualizacja**: Zmiana na serwerze widoczna przy nastepnym uzyciu (bez regeneracji plikow)

### D3: MongoDB jako baza danych

- Elastyczne schematy — skille maja roznorodna strukture (markdown + pliki + metadane + tool definitions)
- Mongoose jako ODM — sprawdzony w ekosystemie Express/TypeScript
- Skalowalna — MongoDB Atlas dla wiekszych wdrozen, lokalna instancja dla self-hosted

### D4: Konfiguracja agentow, nie runtime

FutureHub **definiuje** agentow (jaki provider, jaki model, jakie skille, jakie MCP tools, jakie instrukcje), ale **nie uruchamia** ich. Uzytkownik uruchamia agenta w swoim narzedziu AI (Claude Code, Codex, etc.) z konfiguracja pobrana z FutureHub.

Powody:
- Prostszy serwer (nie trzeba zarzadzac procesami, sandboxami, kolejkami)
- Bezpieczniejszy (serwer nie wykonuje kodu)
- Narzedzia AI maja juz wbudowany runtime (agent mode w Claude Code, Codex, Gemini)
- Latwiejszy deployment (serwer to stateless HTTP + DB)

### D5: Szyfrowanie kluczy API providerow w bazie

Klucze API providerow (Anthropic, OpenAI) sa szyfrowane AES-256-GCM w MongoDB. Klucz szyfrowania zyje w zmiennej srodowiskowej (`ENCRYPTION_KEY`), nigdy w bazie. To kompromis miedzy bezpieczenstwem OS Keychain (architektura Mikolaja) a praktycznoscia serwera (Keychain dziala tylko lokalnie).

### D6: Express + TypeScript + Vue 3 + Vuetify 3

- **Express**: Prosty, dojrzaly, duzy ekosystem middleware
- **TypeScript**: Type safety dla modeli, serwisow, API
- **Vue 3**: Composition API + `<script setup>` — nowoczesny, lekki frontend
- **Vuetify 3**: Material Design 3 — gotowe komponenty (tabele, formularze, dialogi, navigation drawer)

---

## 4. Architektura systemu

### Diagram ogolny

```
┌─────────────────────────────────────────────────────────────────┐
│                          KLIENCI                                 │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────┐    │
│  │  Vue 3 SPA   │    │ Claude Code  │    │  Codex / Gemini│    │
│  │ (Dashboard)  │    │ (MCP Client) │    │  (MCP Client)  │    │
│  └──────┬───────┘    └──────┬───────┘    └───────┬────────┘    │
│         │ JWT               │ API Key            │ API Key     │
└─────────┼───────────────────┼────────────────────┼─────────────┘
          │                   │                    │
┌─────────┼───────────────────┼────────────────────┼─────────────┐
│         ▼       EXPRESS     ▼                    ▼             │
│  ┌──────────────┐    ┌──────────────────────────────────┐     │
│  │  REST API    │    │          MCP Server               │     │
│  │  (Dashboard) │    │  (Serwuje skille, instrukcje,     │     │
│  │              │    │   tool definitions, agent config)  │     │
│  └──────┬───────┘    └──────────────┬───────────────────┘     │
│         │                           │                          │
│         ▼                           ▼                          │
│  ┌───────────────────────────────────────────────────────┐    │
│  │               WARSTWA SERWISOW                         │    │
│  │                                                        │    │
│  │  ┌─── CORE 1 ─────────────────────────────────────┐   │    │
│  │  │ AuthService   SkillService   RoleService        │   │    │
│  │  │ UserService   InstructionService  UsageService  │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  │                                                        │    │
│  │  ┌─── CORE 2 ─────────────────────────────────────┐   │    │
│  │  │ AgentService       ProviderService              │   │    │
│  │  │ McpConfigService   ToolRegistryService          │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  └────────────────────────┬───────────────────────────────┘    │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────┐    │
│  │                      MongoDB                           │    │
│  │                                                        │    │
│  │  Users   Roles   Skills   SkillVersions   ApiKeys     │    │
│  │  Agents  Providers  McpServers  Instructions  Logs    │    │
│  └───────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

### Przeplywy danych

```
┌──────────────────────────────────────────────────────────────┐
│ PRZEPLYW 1: Admin zarzadza przez Dashboard                    │
│                                                                │
│  Admin (przegladarka)                                         │
│    │                                                           │
│    ▼                                                           │
│  Vue 3 SPA ──[JWT]──▶ REST API ──▶ Service ──▶ MongoDB       │
│    ▲                      │                                    │
│    └──────────────────────┘                                    │
│         (JSON response)                                        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ PRZEPLYW 2: Pracownik uzywa narzedzia AI                      │
│                                                                │
│  Claude Code / Codex / Gemini (na maszynie pracownika)        │
│    │                                                           │
│    ▼                                                           │
│  MCP Client ──[API Key]──▶ MCP Server                         │
│    │                           │                               │
│    │                           ▼                               │
│    │                      Service ──▶ MongoDB                  │
│    │                           │                               │
│    │                      RBAC check: user.roles -> skills     │
│    │                           │                               │
│    ▼                           ▼                               │
│  Narzedzie AI otrzymuje:                                      │
│    - Skille przypisane do rol pracownika                      │
│    - Instrukcje kontekstowe (globalne + per-agent)            │
│    - Definicje custom tools                                    │
│    - Konfiguracje agentow                                     │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ PRZEPLYW 3: Agent Builder (tworzenie agenta)                  │
│                                                                │
│  Admin w Dashboard:                                           │
│    │                                                           │
│    ├── Krok 1: Nazwa + opis agenta                            │
│    ├── Krok 2: Wybor providera (Anthropic/OpenAI) + modelu    │
│    ├── Krok 3: Przypisanie skilli z biblioteki                │
│    ├── Krok 4: Przypisanie zewnetrznych MCP serwerow          │
│    ├── Krok 5: Wybor/edycja instrukcji kontekstowych          │
│    └── Krok 6: Przypisanie do rol (kto moze uzywac)           │
│                                                                │
│    ▼                                                           │
│  POST /api/agents ──▶ AgentService ──▶ MongoDB                │
│                                                                │
│    ▼                                                           │
│  Agent dostepny przez MCP dla przypisanych uzytkownikow       │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Core 1 — Zarzadzanie skillami i uzytkownikami

Core 1 bazuje bezposrednio na architekturze SkillHub (Dawid) i odpowiada za:

### 5.1. Skille

**Skill** to jednostka wiedzy/instrukcji dostarczana do narzedzia AI. Moze zawierac:
- Tresc markdown (prompt, instrukcja, kontekst)
- Zalaczone pliki (szablony, przyklady, referencje)
- Definicje custom MCP tools (nazwa, opis, input schema, handler)

Kazdy skill jest **wersjonowany**. Edycja tresci tworzy nowa wersje (`SkillVersion`). Skill zawsze wskazuje na `currentVersion`. Admin moze:
- Przegladac historie wersji
- Porownywac wersje (diff markdown)
- Przywracac poprzednia wersje (rollback — kopiuje stara wersje jako nowa, nie nadpisuje historii)

Skille sa **kategoryzowane** (np. "frontend", "devops", "testing") i **tagowane** dla latwego wyszukiwania.

### 5.2. Uzytkownicy

Dwa typy uzytkownikow:
- **Admin**: Pelny dostep do dashboardu, CRUD na wszystkich zasobach
- **Pracownik (User)**: Dostep tylko przez MCP (narzedzie AI), widzi tylko skille przypisane do swoich rol

Admin tworzy konta pracownikow i generuje dla nich **API keys** (do autentykacji MCP). API key jest pokazywany tylko raz przy generowaniu, w bazie przechowywany jako hash.

### 5.3. Role

Role to mechanizm grupowania skilli. Przyklad:
- Rola "frontend-dev" → skille: "Vue Component Generator", "CSS Best Practices", "TypeScript Conventions"
- Rola "devops" → skille: "Docker Compose Helper", "CI/CD Pipeline", "Monitoring Setup"
- Rola "manager" → skille: "Code Review Checklist", "Sprint Planning"

Pracownik moze miec wiele rol. Widzi unie skilli ze wszystkich swoich rol.

### 5.4. Analityka

System loguje kazde pobranie skilla przez MCP (kto, kiedy, jaki skill, jaka wersja). Dashboard analityczny pokazuje:
- Top uzywane skille
- Aktywni uzytkownicy
- Trendy uzycia w czasie
- Aktywnosc per uzytkownik

---

## 6. Core 2 — Hub agentow AI i orkiestrator konfiguracji

Core 2 to uproszczenie architektury Mikolaja — zamiast lokalnych plikow, symlinkow i generatorow, wszystko zyje w MongoDB i jest serwowane przez MCP.

### 6.1. Providerzy AI

Rejestr providerow AI, z ktorymi firma wspolpracuje. Na start: **Anthropic** (Claude) i **OpenAI** (GPT).

Kazdy provider zawiera:
- Zaszyfrowany klucz API (AES-256-GCM)
- Liste dostepnych modeli (np. claude-sonnet-4-6, claude-opus-4-6, gpt-4o, o3)
- Status aktywnosci
- Mozliwosc testu polaczenia z poziomu dashboardu

Admin rejestruje providera raz. Klucz API jest szyfrowany i przechowywany w MongoDB. Nigdy nie jest wyswietlany ponownie w UI (tylko prefix do identyfikacji).

### 6.2. Agenty AI (orkiestrator konfiguracji)

**Agent** w FutureHub to **zdefiniowany zestaw konfiguracji**, nie proces. Agent sklada sie z:

```
Agent = Provider + Model + Skille + MCP Tools + Instrukcje + Role (dostep)
```

Przyklad agenta:
```
Nazwa:        "Frontend Dev Agent"
Provider:     Anthropic
Model:        claude-sonnet-4-6
Skille:       [Vue Component Generator, TypeScript Conventions, CSS Best Practices]
MCP Tools:    [GitHub MCP, Figma MCP]
Instrukcje:   "Pracujesz jako senior frontend developer. Uzywasz Vue 3 Composition API..."
Role:         [frontend-dev]
```

Pracownik z rola "frontend-dev" laczy sie z FutureHub przez MCP i otrzymuje pelna konfiguracje tego agenta — skille, instrukcje, tools. Jego narzedzie AI (np. Claude Code) automatycznie "staje sie" tym agentem.

**Agent Builder** w dashboardzie to wizard 6-krokowy:
1. Podstawy (nazwa, opis)
2. Provider + Model (z listy zarejestrowanych)
3. Skille (checkbox z wyszukiwarka)
4. MCP Tools (zewnetrzne serwery MCP)
5. Instrukcje (edytor markdown)
6. Dostep (przypisanie do rol)

### 6.3. Konfiguracja zewnetrznych serwerow MCP

Rejestr serwerow MCP, z ktorymi agenty moga sie integrowac. Przyklad:
- GitHub MCP — dostep do repo, issues, PR
- Slack MCP — wysylanie wiadomosci, czytanie kanalow
- Jira MCP — zarzadzanie taskami
- Wlasne MCP serwery firmy

Kazdy wpis zawiera:
- Transport (stdio / sse / streamable-http)
- URL lub command + args (w zaleznosci od transportu)
- Headers (z placeholderami `${VAR}`)
- Opis

Admin rejestruje serwer MCP raz, potem przypisuje go do agentow. Pracownik nie musi konfigurowac MCP po swojej stronie — wszystko przychodzi z FutureHub.

### 6.4. Instrukcje kontekstowe

Odpowiednik `INSTRUCTIONS.md` z architektury Mikolaja, ale przechowywany w MongoDB. Dwa zakresy:

- **Globalne**: Dotycza wszystkich agentow (np. "Odpowiadaj po polsku", "Uzywaj TypeScript", "Testuj kazda zmiane")
- **Per-agent**: Specyficzne dla danego agenta (np. kontekst projektu, konwencje nazewnictwa, stack technologiczny)

Instrukcje sa serwowane przez MCP i automatycznie dostarczane do narzedzia AI pracownika.

---

## 7. MCP Server — most miedzy serwerem a narzedziami AI

MCP Server implementuje [Model Context Protocol](https://modelcontextprotocol.io/) i jest jedynym interfejsem miedzy FutureHub a narzedziami AI pracownikow.

### Metody MCP

| Metoda MCP | Zrodlo | Opis |
|------------|--------|------|
| `skills/list` | Core 1 | Lista skilli dostepnych dla uzytkownika (na podstawie jego rol) |
| `skills/get` | Core 1 | Pobranie tresci skilla (markdown + metadane) |
| `skills/files` | Core 1 | Pobranie plikow zalaczonych do skilla |
| `tools/list` | Core 1 | Lista custom tools zdefiniowanych w skillach uzytkownika |
| `tools/call` | Core 1 | Wywolanie custom toola |
| `instructions/get` | Core 2 | Instrukcje kontekstowe (globalne + per-agent) |
| `agents/list` | Core 2 | Lista agentow dostepnych dla uzytkownika |
| `agents/get` | Core 2 | Pelna konfiguracja agenta (provider, model, skille, tools, instrukcje) |

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

## 8. Modele danych (MongoDB)

### 8.1. Core 1 — Modele

#### User
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

#### Role
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

#### Skill
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

#### SkillVersion
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

#### ApiKey
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

#### UsageLog
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

### 8.2. Core 2 — Modele

#### Provider
```typescript
interface IProvider {
  _id: ObjectId;
  name: string;                  // "anthropic", "openai"
  displayName: string;           // "Anthropic (Claude)", "OpenAI (GPT)"
  type: 'anthropic' | 'openai';
  apiKeyEncrypted: string;       // zaszyfrowany AES-256-GCM
  apiKeyPrefix: string;          // pierwsze 8 znakow do identyfikacji
  baseUrl?: string;              // opcjonalny custom endpoint (np. Azure OpenAI)
  models: IModel[];              // dostepne modele
  isActive: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IModel {
  modelId: string;               // "claude-sonnet-4-6", "gpt-4o"
  displayName: string;           // "Claude Sonnet 4.6", "GPT-4o"
  isDefault: boolean;
}
```

#### Agent
```typescript
interface IAgent {
  _id: ObjectId;
  name: string;                  // "Frontend Dev Agent", "DevOps Agent"
  slug: string;
  description: string;
  provider: ObjectId;            // ref do Provider
  model: string;                 // modelId z Provider.models
  skills: ObjectId[];            // ref do Skill[]
  mcpServers: ObjectId[];        // ref do McpServerConfig[]
  instructions: ObjectId[];      // ref do Instruction[] (wiele instrukcji)
  isActive: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

#### McpServerConfig
```typescript
interface IMcpServerConfig {
  _id: ObjectId;
  name: string;                  // "github", "slack", "jira"
  displayName: string;           // "GitHub MCP", "Slack MCP"
  transport: 'stdio' | 'sse' | 'streamable-http';
  // Dla HTTP:
  url?: string;                  // np. "https://mcp.github.com/sse"
  headers?: Record<string, string>;  // z ${VAR} placeholderami
  // Dla stdio:
  command?: string;              // np. "node"
  args?: string[];               // np. ["./build/index.js"]
  env?: Record<string, string>;  // zmienne srodowiskowe
  description: string;
  isActive: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Instruction
```typescript
interface IInstruction {
  _id: ObjectId;
  name: string;                  // "Global Rules", "Frontend Project Context"
  content: string;               // markdown — odpowiednik INSTRUCTIONS.md
  scope: 'global' | 'agent';    // globalne (dla wszystkich) vs per-agent
  isActive: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

### 8.3. Diagram relacji

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

┌──────────┐     N:1      ┌──────────┐
│  Agent   │─────────────▶│ Provider │
│          │  agent.       │          │
│          │  provider     └──────────┘
│          │
│          │  N:M          ┌──────────────┐
│          │──────────────▶│McpServerConfig│
│          │  agent.        └──────────────┘
│          │  mcpServers
│          │
│          │  N:M          ┌─────────────┐
│          │──────────────▶│ Instruction │
│          │  agent.        └─────────────┘
└──────────┘  instructions

     ┌──────────┐
     │ UsageLog │  (loguje kazde pobranie skilla)
     └──────────┘
```

---

## 9. REST API — pelna specyfikacja endpointow

### 9.1. Autentykacja (JWT)

| Method | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/auth/login` | Login admina (email + haslo -> JWT) |
| POST | `/api/auth/refresh` | Odswiezenie tokena |
| GET | `/api/auth/me` | Profil zalogowanego uzytkownika |

### 9.2. Users (Admin only)

| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/users` | Lista uzytkownikow (paginacja, filtrowanie) |
| POST | `/api/users` | Dodanie nowego uzytkownika |
| GET | `/api/users/:id` | Szczegoly uzytkownika |
| PUT | `/api/users/:id` | Edycja uzytkownika |
| DELETE | `/api/users/:id` | Deaktywacja uzytkownika |
| POST | `/api/users/:id/api-keys` | Wygenerowanie API key |
| DELETE | `/api/users/:id/api-keys/:keyId` | Uniewaznienie API key |

### 9.3. Roles (Admin only)

| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/roles` | Lista rol |
| POST | `/api/roles` | Utworzenie roli |
| PUT | `/api/roles/:id` | Edycja roli (w tym przypisanie skilli i agentow) |
| DELETE | `/api/roles/:id` | Usuniecie roli |

### 9.4. Skills (Admin only)

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

### 9.5. Providers (Admin only) — Core 2

| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/providers` | Lista providerow |
| POST | `/api/providers` | Dodanie providera (z zaszyfrowanym API key) |
| GET | `/api/providers/:id` | Szczegoly providera (bez klucza API) |
| PUT | `/api/providers/:id` | Edycja (opcjonalna zmiana klucza) |
| DELETE | `/api/providers/:id` | Deaktywacja |
| GET | `/api/providers/:id/models` | Lista modeli providera |
| POST | `/api/providers/:id/test` | Test polaczenia z API providera |

### 9.6. Agents (Admin only) — Core 2

| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/agents` | Lista agentow |
| POST | `/api/agents` | Utworzenie agenta (wizard) |
| GET | `/api/agents/:id` | Szczegoly agenta z pelna konfiguracja |
| PUT | `/api/agents/:id` | Edycja |
| DELETE | `/api/agents/:id` | Deaktywacja |
| POST | `/api/agents/:id/duplicate` | Klon agenta |

### 9.7. MCP Server Configs (Admin only) — Core 2

| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/mcp-servers` | Lista zarejestrowanych MCP serwerow |
| POST | `/api/mcp-servers` | Rejestracja nowego MCP servera |
| GET | `/api/mcp-servers/:id` | Szczegoly |
| PUT | `/api/mcp-servers/:id` | Edycja |
| DELETE | `/api/mcp-servers/:id` | Usuniecie |
| POST | `/api/mcp-servers/:id/test` | Test polaczenia |

### 9.8. Instructions (Admin only) — Core 2

| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/instructions` | Lista instrukcji |
| POST | `/api/instructions` | Utworzenie |
| GET | `/api/instructions/:id` | Szczegoly |
| PUT | `/api/instructions/:id` | Edycja |
| DELETE | `/api/instructions/:id` | Usuniecie |

### 9.9. Analytics (Admin only)

| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/analytics/dashboard` | Podsumowanie (top skille, aktywni uzytkownicy) |
| GET | `/api/analytics/skills/:id/usage` | Statystyki uzycia skilla |
| GET | `/api/analytics/users/:id/activity` | Aktywnosc uzytkownika |

---

## 10. System uprawnien (RBAC)

```
Admin
 ├── Pelny dostep do dashboardu (Vue 3 SPA)
 ├── CRUD: Users, Roles, Skills, Providers, Agents, MCP Servers, Instructions
 ├── Generowanie/uniewaznianie API keys
 ├── Dostep do analityki
 └── Definiowanie agentow i przypisywanie do rol

Pracownik (User)
 ├── Ma przypisane role (np. "frontend-dev", "devops")
 ├── Widzi TYLKO skille przypisane do swoich rol
 ├── Widzi TYLKO agentow przypisanych do swoich rol
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

### Logika dostepu — agenty

```
getUserAgents(userId):
  user = User.findById(userId).populate('roles')
  roleIds = user.roles.map(r => r._id)
  agents = Agent.find({ isActive: true })
    .populate('skills mcpServers instructions provider')
  // filtruj agentow ktorych przynajmniej jedna rola usera jest w agent.roles
  // (role sa na obiekcie Role, ktory ma pole agents[])
  return agents.filter(a => hasRoleOverlap(a, roleIds))
```

---

## 11. Bezpieczenstwo

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
| API keys providerow AI | AES-256-GCM | Env var `ENCRYPTION_KEY` |

### Dodatkowe zabezpieczenia

- **Rate limiting**: Per API key, konfigurowalny (np. 100 req/min)
- **CORS**: Ograniczony do domeny dashboardu
- **Helmet**: Standardowe HTTP security headers
- **Input validation**: express-validator na kazdym endpoincie
- **Audit log**: Kazda zmiana admina logowana z userId, timestamp, action

---

## 12. Frontend — Dashboard Vue 3

### Nawigacja (sidebar)

```
┌─────────────────────────────────────────────────────────┐
│  FutureHub                                    [User ▾]  │
├────────────────┬────────────────────────────────────────┤
│                │                                        │
│  Dashboard     │                                        │
│                │         [Glowna zawartosc]              │
│  ── CORE 1 ── │                                        │
│  Skills        │                                        │
│  Users         │                                        │
│  Roles         │                                        │
│                │                                        │
│  ── CORE 2 ── │                                        │
│  Agents        │                                        │
│  Providers     │                                        │
│  MCP Servers   │                                        │
│  Instructions  │                                        │
│                │                                        │
│  ── SYSTEM ── │                                        │
│  Analytics     │                                        │
│  Settings      │                                        │
│                │                                        │
└────────────────┴────────────────────────────────────────┘
```

### Kluczowe widoki

| Widok | Funkcjonalnosc |
|-------|----------------|
| **Dashboard** | Podsumowanie: liczba skilli, uzytkownikow, agentow + top skille + ostatnia aktywnosc |
| **SkillList** | Tabela skilli z paginacja, filtrowanie po kategorii/tagach, szybkie akcje |
| **SkillEditor** | Edytor markdown (split view: edycja / podglad), upload plikow, definicja tools |
| **SkillVersions** | Lista wersji, diff viewer (porownanie dwoch wersji), przycisk rollback |
| **UserList** | Tabela uzytkownikow, status (aktywny/nieaktywny), przypisane role |
| **UserEdit** | Formularz edycji + zarzadzanie API keys (generowanie, uniewaznianie) |
| **RoleList** | Lista rol z liczba przypisanych skilli i uzytkownikow |
| **RoleEdit** | Edycja roli + przypisywanie skilli (checkbox list) + przypisywanie agentow |
| **AgentList** | Karty agentow z provider badge, liczba skilli/tools |
| **AgentBuilder** | Wizard 6-krokowy (patrz sekcja 6.2) |
| **AgentDetail** | Podglad pelnej konfiguracji agenta, przycisk "Duplicate" |
| **ProviderList** | Lista providerow AI z status badge, przycisk "Test Connection" |
| **ProviderEdit** | Formularz: nazwa, typ, API key (masked input), modele |
| **McpServerList** | Tabela MCP serwerow z transport badge, przycisk "Test" |
| **McpServerEdit** | Formularz z dynamicznymi polami w zaleznosci od transportu |
| **InstructionList** | Lista instrukcji z scope badge (global/agent) |
| **InstructionEditor** | Pelnoekranowy edytor markdown |
| **Analytics** | Wykresy (chart.js): uzycie skilli w czasie, top uzytkownicy, heatmapa aktywnosci |

### Kluczowe komponenty wspolne

| Komponent | Uzycie |
|-----------|--------|
| `MarkdownEditor.vue` | Edycja skilli i instrukcji (split: kod / podglad) |
| `DiffViewer.vue` | Porownywanie wersji skilli |
| `FileUploader.vue` | Upload plikow do skilli |
| `StatsChart.vue` | Wykresy analityki (wrapper na chart.js) |
| `ConfirmDialog.vue` | Potwierdzenie destrukcyjnych akcji |
| `StatusBadge.vue` | Badge aktywnosci (aktywny/nieaktywny) |

---

## 13. Struktura projektu (Monorepo)

```
futurehub/
├── package.json                        # Workspaces root (npm workspaces)
├── docker-compose.yml                  # MongoDB + opcjonalnie app
├── .env.example                        # Wzor zmiennych srodowiskowych
├── .gitignore
├── README.md
│
├── packages/
│   ├── server/                         # ══════ BACKEND ══════
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                # Entry point (Express + MCP Server)
│   │       │
│   │       ├── config/
│   │       │   └── index.ts            # Env variables, DB config, encryption config
│   │       │
│   │       ├── models/                 # Mongoose schemas
│   │       │   ├── User.ts
│   │       │   ├── Role.ts
│   │       │   ├── Skill.ts
│   │       │   ├── SkillVersion.ts
│   │       │   ├── ApiKey.ts
│   │       │   ├── UsageLog.ts
│   │       │   ├── Provider.ts         # Core 2
│   │       │   ├── Agent.ts            # Core 2
│   │       │   ├── McpServerConfig.ts  # Core 2
│   │       │   └── Instruction.ts      # Core 2
│   │       │
│   │       ├── routes/                 # Express route handlers
│   │       │   ├── auth.ts
│   │       │   ├── users.ts
│   │       │   ├── roles.ts
│   │       │   ├── skills.ts
│   │       │   ├── analytics.ts
│   │       │   ├── providers.ts        # Core 2
│   │       │   ├── agents.ts           # Core 2
│   │       │   ├── mcpServers.ts       # Core 2
│   │       │   └── instructions.ts     # Core 2
│   │       │
│   │       ├── services/               # Logika biznesowa
│   │       │   ├── AuthService.ts
│   │       │   ├── UserService.ts
│   │       │   ├── SkillService.ts
│   │       │   ├── RoleService.ts
│   │       │   ├── UsageService.ts
│   │       │   ├── ProviderService.ts  # Core 2
│   │       │   ├── AgentService.ts     # Core 2
│   │       │   ├── McpConfigService.ts # Core 2
│   │       │   ├── InstructionService.ts # Core 2
│   │       │   └── ToolRegistryService.ts # Core 2
│   │       │
│   │       ├── middleware/
│   │       │   ├── jwtAuth.ts          # JWT middleware dla dashboard
│   │       │   ├── apiKeyAuth.ts       # API key middleware dla MCP
│   │       │   ├── rbac.ts             # Sprawdzanie uprawnien
│   │       │   └── rateLimiter.ts      # Rate limiting per API key
│   │       │
│   │       ├── mcp/                    # MCP Server
│   │       │   ├── server.ts           # MCP Server setup (@modelcontextprotocol/sdk)
│   │       │   ├── handlers.ts         # Request handlers (skills, tools, instructions, agents)
│   │       │   └── tools.ts            # Dynamic tool registration
│   │       │
│   │       └── utils/
│   │           ├── crypto.ts           # AES-256-GCM encrypt/decrypt (provider API keys)
│   │           ├── apiKeyGenerator.ts  # Generowanie + hashowanie API keys
│   │           └── logger.ts           # Structured logging
│   │
│   └── client/                         # ══════ FRONTEND ══════
│       ├── package.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.ts                 # Vue app bootstrap
│           ├── App.vue                 # Root component z layout
│           │
│           ├── router/
│           │   └── index.ts            # Vue Router (lazy loading views)
│           │
│           ├── stores/                 # Pinia stores
│           │   ├── auth.ts
│           │   ├── skills.ts
│           │   ├── users.ts
│           │   ├── roles.ts
│           │   ├── providers.ts        # Core 2
│           │   ├── agents.ts           # Core 2
│           │   ├── mcpServers.ts       # Core 2
│           │   └── instructions.ts     # Core 2
│           │
│           ├── api/
│           │   └── index.ts            # Axios instance + interceptors (JWT refresh)
│           │
│           ├── views/
│           │   ├── Login.vue
│           │   ├── Dashboard.vue
│           │   ├── Skills/
│           │   │   ├── SkillList.vue
│           │   │   ├── SkillEditor.vue
│           │   │   └── SkillVersions.vue
│           │   ├── Users/
│           │   │   ├── UserList.vue
│           │   │   └── UserEdit.vue
│           │   ├── Roles/
│           │   │   ├── RoleList.vue
│           │   │   └── RoleEdit.vue
│           │   ├── Providers/
│           │   │   ├── ProviderList.vue
│           │   │   └── ProviderEdit.vue
│           │   ├── Agents/
│           │   │   ├── AgentList.vue
│           │   │   ├── AgentBuilder.vue
│           │   │   └── AgentDetail.vue
│           │   ├── McpServers/
│           │   │   ├── McpServerList.vue
│           │   │   └── McpServerEdit.vue
│           │   ├── Instructions/
│           │   │   ├── InstructionList.vue
│           │   │   └── InstructionEditor.vue
│           │   └── Analytics/
│           │       └── AnalyticsDashboard.vue
│           │
│           └── components/
│               ├── layout/
│               │   ├── AppSidebar.vue
│               │   ├── AppHeader.vue
│               │   └── AppBreadcrumb.vue
│               ├── MarkdownEditor.vue
│               ├── DiffViewer.vue
│               ├── FileUploader.vue
│               ├── StatsChart.vue
│               ├── ConfirmDialog.vue
│               └── StatusBadge.vue
│
├── storage/                            # Uploaded skill files
│   └── skills/
│
└── scripts/
    ├── seed.ts                         # Seed: admin user + sample skills/roles/providers
    └── generate-api-key.ts             # CLI: generowanie API key dla usera
```

---

## 14. Stos technologiczny

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

## 15. Konfiguracja klienta (pracownik)

### Claude Code

Pracownik dodaje FutureHub jako MCP server w `.claude/settings.json`:

```json
{
  "mcpServers": {
    "futurehub": {
      "type": "sse",
      "url": "https://futurehub.firma.com/mcp",
      "headers": {
        "Authorization": "Bearer sk_abc123..."
      }
    }
  }
}
```

### OpenAI Codex CLI

```toml
# ~/.codex/config.toml
[mcp_servers.futurehub]
type = "sse"
url = "https://futurehub.firma.com/mcp"
headers = { Authorization = "Bearer sk_abc123..." }
```

### Google Gemini CLI

```json
// ~/.gemini/settings.json
{
  "mcpServers": {
    "futurehub": {
      "url": "https://futurehub.firma.com/mcp",
      "headers": {
        "Authorization": "Bearer sk_abc123..."
      }
    }
  }
}
```

### Efekt

Po konfiguracji narzedzie AI pracownika automatycznie widzi:
- Skille przypisane do jego rol
- Instrukcje kontekstowe (globalne + per-agent)
- Custom tools zdefiniowane w skillach
- Konfiguracje agentow

**Zero lokalnych plikow skilli, zero symlinkow, zero generatorow.**

---

## 16. Jak FutureHub zastepuje architekture Mikolaja

Architektura Mikolaja rozwiazywala 5 problemow przy pomocy lokalnych plikow, symlinkow i generatorow. FutureHub rozwiazuje te same problemy przy pomocy serwera:

| Problem | Mikolaj (lokalne pliki) | FutureHub (serwer) |
|---------|--------------------------|---------------------|
| **Rozjazd plikow instrukcji** | `~/.agents/instructions/INSTRUCTIONS.md` + symlinki do CLAUDE.md, AGENTS.md, GEMINI.md | MongoDB: `Instruction` model, serwowany przez MCP `instructions/get`. Jedno zrodlo prawdy bez symlinkow |
| **Skille w osobnych silosach** | `~/.agents/skills/` + symlinki do ~/.claude/skills/, ~/.codex/skills/ | MongoDB: `Skill` + `SkillVersion`, serwowane przez MCP `skills/list` i `skills/get`. Jedno miejsce |
| **MCP w niekompatybilnych formatach** | `mcp-servers.yaml` + `gen-mcp.py` generujacy 5 natywnych formatow | MongoDB: `McpServerConfig`, dashboard do zarzadzania. Narzedzia lacza sie z FutureHub MCP — nie potrzebuja natywnych configow |
| **Sekrety rozproszone** | OS Keychain + `secrets-registry.yaml` + `start-session.sh` | `Provider.apiKeyEncrypted` (AES-256-GCM w MongoDB). Klucz szyfrowania w env var serwera |
| **Lokalne serwery MCP bez standardu** | `~/.agents/local-mcp-servers/` z konwencja folderow | `McpServerConfig` z transport=stdio. Rejestracja i zarzadzanie z dashboardu |

### Co znika calkowicie

- `~/.agents/` — folder globalny
- `.agents/` — folder projektowy
- Symlinki (CLAUDE.md -> INSTRUCTIONS.md, .agent -> .agents, .claude/skills -> .agents/skills)
- `gen-mcp.py` — generator konfiguracji MCP
- `sync-docs.sh` — synchronizator instrukcji
- `start-session.sh` — loader sekretow z Keychain
- `install-globals.sh` — instalator symlinkow
- Git pre-commit hooks (do synchronizacji)
- `secrets-registry.yaml`
- `mcp-servers.yaml`
- Meta-skille (`meta-add-mcp-server`, `meta-create-skill`, etc.) — zastapione UI dashboardu

---

## 17. Scenariusze uzycia

### Scenariusz 1: Onboarding nowego pracownika

```
1. Admin loguje sie do dashboardu FutureHub
2. Admin tworzy konto pracownika:
   - Imie, email
   - Przypisuje role: "frontend-dev", "testing"
3. Admin generuje API key dla pracownika
   - System wyswietla: sk_fh_a1b2c3d4e5f6...
   - Admin kopiuje i przekazuje pracownikowi (bezpiecznym kanalem)
4. Pracownik dodaje jeden wpis do swojego narzedzia AI:
   - mcpServers.futurehub.url = "https://futurehub.firma.com/mcp"
   - mcpServers.futurehub.headers.Authorization = "Bearer sk_fh_a1b2c3d4e5f6..."
5. Gotowe. Pracownik uruchamia Claude Code i automatycznie widzi:
   - Skille z rol "frontend-dev" + "testing"
   - Agentow przypisanych do tych rol
   - Instrukcje kontekstowe
```

### Scenariusz 2: Dodanie nowego skilla

```
1. Admin otwiera Dashboard -> Skills -> New Skill
2. Wypelnia: nazwa, kategoria, tagi
3. Pisze tresc w edytorze markdown (split view)
4. Opcjonalnie: dodaje pliki, definiuje custom MCP tools
5. Klikniecie "Publish" -> skill dostepny
6. Admin przypisuje skill do roli (Roles -> Edit -> zaznacz skill)
7. Pracownicy z ta rola natychmiast widza nowy skill przez MCP
```

### Scenariusz 3: Tworzenie agenta AI

```
1. Admin otwiera Dashboard -> Agents -> New Agent (Agent Builder)
2. Krok 1: Nazwa "DevOps Agent", opis
3. Krok 2: Provider = Anthropic, Model = claude-sonnet-4-6
4. Krok 3: Skille = [Docker Helper, CI/CD Pipeline, K8s Troubleshooter]
5. Krok 4: MCP Tools = [GitHub MCP, AWS MCP]
6. Krok 5: Instrukcje = "Jestes senior DevOps engineer..."
7. Krok 6: Role = [devops]
8. Zapisz -> Agent dostepny przez MCP
9. Pracownik z rola "devops" uruchamia Claude Code:
   - Widzi agenta "DevOps Agent" w MCP resources
   - Moze pobrac pelna konfiguracje (provider, model, skille, instrukcje)
   - Jego Claude Code "staje sie" tym agentem
```

### Scenariusz 4: Rotacja klucza API providera

```
1. Admin otwiera Dashboard -> Providers -> Anthropic -> Edit
2. Wkleja nowy klucz API (stary jest nadpisywany)
3. System szyfruje nowy klucz AES-256-GCM i zapisuje w MongoDB
4. Gotowe — zero zmian po stronie pracownikow
   (pracownicy nie widza kluczy providerow, lacza sie przez FutureHub)
```

### Scenariusz 5: Monitorowanie uzycia

```
1. Admin otwiera Dashboard -> Analytics
2. Widzi:
   - Top 10 uzywanych skilli (ten tydzien/miesiac)
   - Aktywni uzytkownicy (kto ostatnio pobieral skille)
   - Trend uzycia w czasie (line chart)
   - Heatmapa aktywnosci (dni tygodnia x godziny)
3. Klika na konkretny skill -> widzi kto i kiedy go uzywal
4. Klika na uzytkownika -> widzi jakie skille pobieral
```

---

## 18. Deployment i hosting

### Model: Self-hosted per klient

Kazdy klient otrzymuje wlasna instancje FutureHub:

```
┌──────────────────────────────────────┐
│  VPS / VM klienta                    │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Docker Compose                │  │
│  │                                │  │
│  │  ┌──────────┐  ┌───────────┐  │  │
│  │  │ FutureHub│  │  MongoDB  │  │  │
│  │  │ (Node.js)│  │  (data    │  │  │
│  │  │ port 3000│  │  volume)  │  │  │
│  │  └──────────┘  └───────────┘  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  nginx (reverse proxy + SSL)  │  │
│  │  futurehub.firma.com -> :3000 │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### docker-compose.yml (szkic)

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/futurehub
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      - mongo

  mongo:
    image: mongo:7
    volumes:
      - mongo-data:/data/db
    ports:
      - "27017:27017"

volumes:
  mongo-data:
```

### Zmienne srodowiskowe (.env)

```bash
# Server
PORT=3000
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb://mongo:27017/futurehub

# Auth
JWT_SECRET=<random-64-char-string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption (AES-256-GCM dla provider API keys)
ENCRYPTION_KEY=<random-32-byte-hex-string>

# Admin seed
ADMIN_EMAIL=admin@firma.com
ADMIN_PASSWORD=<initial-password>

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

---

## 19. Plan realizacji — fazy

### Faza 1 — Fundament (Core 1 MVP)

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

### Faza 2 — Core 2 (Hub agentow)

- [ ] Modele MongoDB: Provider, Agent, McpServerConfig, Instruction
- [ ] REST API: Providers CRUD + test connection
- [ ] REST API: Agents CRUD + duplicate
- [ ] REST API: MCP Servers CRUD + test
- [ ] REST API: Instructions CRUD
- [ ] MCP Server: rozszerzenie o instructions/get, agents/list, agents/get
- [ ] Frontend: ProviderList, ProviderEdit
- [ ] Frontend: AgentBuilder (wizard 6 krokow), AgentList, AgentDetail
- [ ] Frontend: McpServerList, McpServerEdit
- [ ] Frontend: InstructionList, InstructionEditor

### Faza 3 — Pliki, wersje i diff

- [ ] Upload plikow do skilli (multer + local storage)
- [ ] Pelny diff viewer (porownywanie wersji skilli)
- [ ] SkillVersions view w dashboardzie
- [ ] Rollback UX

### Faza 4 — Analityka i polish

- [ ] UsageLog: logowanie kazdego pobrania skilla przez MCP
- [ ] REST API: Analytics endpoints
- [ ] Frontend: AnalyticsDashboard (wykresy, top skille, aktywnosc)
- [ ] Rate limiting
- [ ] Audit log (logi zmian admina)
- [ ] Dokumentacja deploymentu

### Faza 5 — Rozszerzenia (opcjonalne, przyszlosc)

- [ ] Import/export skilli (JSON/ZIP) — migracja miedzy instancjami
- [ ] Webhook notifications (np. Slack alert gdy skill zaktualizowany)
- [ ] CLI tool do zarzadzania FutureHub z terminala
- [ ] Multi-tenant mode (jedna instancja, wiele organizacji)
- [ ] Billing i subscription management (SaaS)
- [ ] Tryb offline (cache skilli po stronie klienta)
- [ ] Public API z dokumentacja OpenAPI/Swagger
- [ ] Marketplace skilli miedzy organizacjami

---

## 20. Ograniczenia i kierunki rozwoju

### Co FutureHub rozwiazuje

- Centralne zarzadzanie skillami AI w firmie z RBAC
- Wersjonowanie skilli z historia i rollbackiem
- Dystrybucja skilli do wielu narzedzi AI przez jeden MCP endpoint
- Definiowanie agentow AI (provider + model + skille + tools + instrukcje)
- Rejestr providerow AI z bezpiecznym przechowywaniem kluczy
- Rejestr zewnetrznych serwerow MCP
- Instrukcje kontekstowe (globalne i per-agent)
- Analityka uzycia skilli
- Self-hosted deployment per klient

### Czego FutureHub nie rozwiazuje (swiadome ograniczenia)

- **Brak runtime agentow**: Serwer nie uruchamia agentow — tylko konfiguruje. Agent dziala na maszynie pracownika w jego narzedziu AI
- **Wymaga polaczenia z serwerem**: Brak trybu offline (planowany w Fazie 5)
- **Subagenty nieprzenoszalne**: Definicje subagentow (`.claude/agents/*.md`, `.codex/agents/*.toml`) zostaja natywne per narzedzie
- **Custom commands/hooks nieprzenoszalne**: Kazde narzedzie AI ma wlasny format — FutureHub ich nie harmonizuje
- **Single-tenant**: Jedna instancja = jedna organizacja (multi-tenant planowany w Fazie 5)

### Kierunki rozwoju

1. **Runtime agentow**: Mozliwosc uruchamiania agentow na serwerze (background tasks, scheduled tasks) — wymaga sandboxingu i kolejek
2. **Multi-tenant SaaS**: Jedna instancja, wiele organizacji, billing
3. **Marketplace skilli**: Wymiana skilli miedzy organizacjami
4. **Agent analytics**: Nie tylko uzycie skilli, ale pelna telemetria agentow (czas wykonania, sukces/blad, koszt tokenow)
5. **Provider routing**: Inteligentne kierowanie requestow do najtanszego/najszybszego providera
6. **Tryb offline**: Cache skilli i konfiguracji po stronie klienta z synchronizacja

---

## Podsumowanie

FutureHub laczy sile dwoch architektur:
- **Od Dawida (SkillHub)**: Aplikacja webowa, Express + Vue 3 + MongoDB, RBAC, wersjonowanie skilli, MCP Server, dashboard admina
- **Od Mikolaja**: Zarzadzanie wieloma narzedziami AI, konfiguracja MCP, instrukcje kontekstowe, koncepcja "jednego zrodla prawdy"

Kluczowe uproszczenie: cala warstwa lokalna z architektury Mikolaja (symlinki, generatory, git hooks, skrypty) zostaje zastapiona jednym serwerem z MCP endpoint. Pracownik konfiguruje jedno polaczenie MCP i otrzymuje wszystko — skille, instrukcje, tools, konfiguracje agentow — automatycznie, na podstawie swoich rol.

Dwa core'y systemu:
- **Core 1**: Zarzadzanie skillami, uzytkownikami, rolami (fundament)
- **Core 2**: Hub agentow AI — providerzy, definicje agentow, MCP serwery, instrukcje (nadbudowa)

Stack: Express + TypeScript | Vue 3 + Vuetify 3 | MongoDB | MCP Server (@modelcontextprotocol/sdk)

Model: Self-hosted per klient, docelowo SaaS.
