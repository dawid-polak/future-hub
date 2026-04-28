import { autoUpdater } from 'electron-updater';
import log from 'electron-log/main';
import { BrowserWindow } from 'electron';
import { IPC } from '../shared/ipcChannels.js';

autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function broadcast(payload: any) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC.UPDATE_STATUS, payload);
  }
}

autoUpdater.on('checking-for-update', () => broadcast({ status: 'checking' }));
autoUpdater.on('update-available', (info) => broadcast({ status: 'available', version: info.version }));
autoUpdater.on('update-not-available', () => broadcast({ status: 'up-to-date' }));
autoUpdater.on('error', (err) => broadcast({ status: 'error', error: err.message }));
autoUpdater.on('download-progress', (p) => broadcast({ status: 'downloading', percent: p.percent }));
autoUpdater.on('update-downloaded', (info) => broadcast({ status: 'downloaded', version: info.version }));

export function checkForUpdates(): void {
  if (process.env.NODE_ENV === 'development') {
    log.info('Skipping update check in dev mode');
    return;
  }
  void autoUpdater.checkForUpdatesAndNotify().catch((e) => log.error('Update check failed', e));
}
