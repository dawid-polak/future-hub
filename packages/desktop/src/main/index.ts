import { app, BrowserWindow } from 'electron';
import log from 'electron-log/main';
import { createMainWindow } from './window.js';
import { createTray } from './tray.js';
import { registerIpc } from './ipc.js';
import * as scheduler from './scheduler.js';
import { checkForUpdates } from './updater.js';
import * as autoStart from './autoStart.js';
import { store } from './store.js';

log.initialize();
log.transports.file.level = 'info';
log.info(`Future Hub Desktop ${app.getVersion()} starting`);

const lock = app.requestSingleInstanceLock();
if (!lock) {
  app.quit();
}

app.on('second-instance', () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
});

void app.whenReady().then(() => {
  registerIpc();
  createMainWindow();
  createTray();

  // Sync auto-start z preferencji
  autoStart.setAutoStart(store.get('autoStart'));

  // Tylko gdy zalogowany — uruchom scheduler
  if (store.get('authTokenEnc')) {
    scheduler.start();
  }

  setTimeout(() => checkForUpdates(), 30_000);
});

app.on('window-all-closed', () => {
  // Zostań w tray; jawnie quit przez tray menu
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  (global as any).isQuitting = true;
});
