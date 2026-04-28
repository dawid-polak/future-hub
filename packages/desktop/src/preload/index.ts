import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipcChannels.js';
import type {
  AuthStatus,
  SyncProgress,
  AppInfo,
  MigrationStatus,
} from '../shared/types.js';

const api = {
  auth: {
    login: (email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> =>
      ipcRenderer.invoke(IPC.AUTH_LOGIN, { email, password }),
    logout: (): Promise<{ ok: boolean }> => ipcRenderer.invoke(IPC.AUTH_LOGOUT),
    status: (): Promise<AuthStatus> => ipcRenderer.invoke(IPC.AUTH_STATUS),
  },
  sync: {
    run: (): Promise<void> => ipcRenderer.invoke(IPC.SYNC_RUN),
    status: (): Promise<SyncProgress> => ipcRenderer.invoke(IPC.SYNC_STATUS),
    onProgress: (cb: (p: SyncProgress) => void) => {
      const listener = (_: unknown, p: SyncProgress) => cb(p);
      ipcRenderer.on(IPC.SYNC_PROGRESS, listener);
      return () => ipcRenderer.removeListener(IPC.SYNC_PROGRESS, listener);
    },
  },
  system: {
    info: (): Promise<AppInfo> => ipcRenderer.invoke(IPC.SYSTEM_INFO),
    openWorkdir: (): Promise<void> => ipcRenderer.invoke(IPC.SYSTEM_OPEN_WORKDIR),
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke(IPC.SYSTEM_OPEN_EXTERNAL, url),
  },
  settings: {
    get: (): Promise<{ apiBase: string; companyName: string; syncIntervalMinutes: number; autoStart: boolean }> =>
      ipcRenderer.invoke(IPC.SETTINGS_GET),
    set: (payload: { apiBase?: string; syncIntervalMinutes?: number; autoStart?: boolean }): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke(IPC.SETTINGS_SET, payload),
  },
  migration: {
    status: (): Promise<MigrationStatus> => ipcRenderer.invoke(IPC.MIGRATION_STATUS),
    run: (): Promise<{ ok: boolean; message: string }> => ipcRenderer.invoke(IPC.MIGRATION_RUN),
  },
  update: {
    onStatus: (cb: (s: { status: string; version?: string; percent?: number; error?: string }) => void) => {
      const listener = (_: unknown, s: any) => cb(s);
      ipcRenderer.on(IPC.UPDATE_STATUS, listener);
      return () => ipcRenderer.removeListener(IPC.UPDATE_STATUS, listener);
    },
  },
};

contextBridge.exposeInMainWorld('fh', api);

export type FhApi = typeof api;
