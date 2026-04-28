import { ipcMain, shell, app } from 'electron';
import { IPC } from '../shared/ipcChannels.js';
import * as auth from './auth.js';
import * as sync from './sync.js';
import * as scheduler from './scheduler.js';
import * as migration from './migration.js';
import * as autoStart from './autoStart.js';
import { store } from './store.js';
import { buildPaths } from './paths.js';
import { rebuildMenu } from './tray.js';
import type { AppInfo } from '../shared/types.js';
import fs from 'fs/promises';

export function registerIpc(): void {
  ipcMain.handle(IPC.AUTH_LOGIN, async (_e, payload: { email: string; password: string }) => {
    const result = await auth.login(payload.email, payload.password);
    if (result.ok) {
      rebuildMenu();
      void scheduler.runNow();
    }
    return result;
  });

  ipcMain.handle(IPC.AUTH_LOGOUT, async () => {
    await sync.clearLocalWorkdir();
    auth.logout();
    rebuildMenu();
    return { ok: true };
  });

  ipcMain.handle(IPC.AUTH_STATUS, () => auth.getAuthStatus());

  ipcMain.handle(IPC.SYNC_RUN, async () => {
    await scheduler.runNow();
    rebuildMenu();
  });

  ipcMain.handle(IPC.SYNC_STATUS, () => sync.getStatus());

  ipcMain.handle(IPC.SYSTEM_INFO, async (): Promise<AppInfo> => {
    const companyName = store.get('companyName');
    const paths = buildPaths(companyName);
    let count = 0;
    try {
      const files = await fs.readdir(paths.skillsDir);
      count = files.filter((f) => f.endsWith('.md')).length;
    } catch {}
    return {
      companyName,
      apiBase: store.get('apiBase'),
      workdir: paths.workdir,
      skillsCount: count,
      appVersion: app.getVersion(),
    };
  });

  ipcMain.handle(IPC.SYSTEM_OPEN_WORKDIR, async () => {
    const paths = buildPaths(store.get('companyName'));
    await shell.openPath(paths.workdir);
  });

  ipcMain.handle(IPC.SYSTEM_OPEN_EXTERNAL, async (_e, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.handle(IPC.SETTINGS_GET, () => ({
    apiBase: store.get('apiBase'),
    companyName: store.get('companyName'),
    syncIntervalMinutes: store.get('syncIntervalMinutes'),
    autoStart: autoStart.getAutoStart(),
  }));

  ipcMain.handle(
    IPC.SETTINGS_SET,
    (_e, payload: { apiBase?: string; syncIntervalMinutes?: number; autoStart?: boolean }) => {
      if (payload.apiBase !== undefined) store.set('apiBase', payload.apiBase);
      if (payload.syncIntervalMinutes !== undefined) {
        store.set('syncIntervalMinutes', payload.syncIntervalMinutes);
        scheduler.restart();
      }
      if (payload.autoStart !== undefined) {
        store.set('autoStart', payload.autoStart);
        autoStart.setAutoStart(payload.autoStart);
      }
      return { ok: true };
    }
  );

  ipcMain.handle(IPC.MIGRATION_STATUS, () => migration.detect());

  ipcMain.handle(IPC.MIGRATION_RUN, () => migration.run());
}
