import Store from 'electron-store';

interface AppStore {
  apiBase: string;
  companyName: string;
  authTokenEnc: string | null;
  userEmail: string | null;
  userName: string | null;
  lastSyncAt: number | null;
  syncIntervalMinutes: number;
  autoStart: boolean;
  legacyMigrated: boolean;
}

const DEFAULT_API_BASE = 'https://future-ai-hub.davidpl.smallhost.pl';
const DEFAULT_COMPANY = 'FutureAI';

export const store = new Store<AppStore>({
  defaults: {
    apiBase: DEFAULT_API_BASE,
    companyName: DEFAULT_COMPANY,
    authTokenEnc: null,
    userEmail: null,
    userName: null,
    lastSyncAt: null,
    syncIntervalMinutes: 10,
    autoStart: true,
    legacyMigrated: false,
  },
  name: 'config',
});
