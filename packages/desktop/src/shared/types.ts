export interface AuthStatus {
  authenticated: boolean;
  email: string | null;
  userName: string | null;
}

export interface SyncProgress {
  state: 'idle' | 'running' | 'success' | 'error';
  message: string;
  added: number;
  removed: number;
  total: number;
  lastSyncAt: number | null;
  error?: string;
}

export interface AppInfo {
  companyName: string;
  apiBase: string;
  workdir: string;
  skillsCount: number;
  appVersion: string;
}

export interface InstallerSkill {
  slug: string;
  filename: string;
  markdown: string;
}

export interface MigrationStatus {
  hasLegacyConfig: boolean;
  legacyWorkdir: string | null;
}
