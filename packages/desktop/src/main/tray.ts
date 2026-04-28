import { Tray, Menu, nativeImage, app, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { showMainWindow } from './window.js';
import { store } from './store.js';
import { buildPaths } from './paths.js';
import * as scheduler from './scheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let tray: Tray | null = null;

export function createTray(): Tray {
  const iconName = process.platform === 'darwin' ? 'trayTemplate.png' : 'icon.png';
  const iconPath = path.join(__dirname, '../../resources', iconName);
  const image = nativeImage.createFromPath(iconPath);
  if (process.platform === 'darwin') {
    image.setTemplateImage(true);
  }
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image);
  tray.setToolTip('Future Hub');
  rebuildMenu();
  tray.on('click', () => showMainWindow());
  return tray;
}

export function rebuildMenu(): void {
  if (!tray) return;
  const userName = store.get('userName') || 'Niezalogowany';
  const companyName = store.get('companyName');
  const paths = buildPaths(companyName);
  const lastSync = store.get('lastSyncAt');
  const lastSyncStr = lastSync
    ? `Ostatni sync: ${new Date(lastSync).toLocaleTimeString()}`
    : 'Nie zsynchronizowano';

  const menu = Menu.buildFromTemplate([
    { label: `Future Hub - ${userName}`, enabled: false },
    { label: lastSyncStr, enabled: false },
    { type: 'separator' },
    { label: 'Pokaż okno', click: () => showMainWindow() },
    { label: 'Synchronizuj teraz', click: () => void scheduler.runNow() },
    { label: 'Otwórz folder', click: () => void shell.openPath(paths.workdir) },
    { type: 'separator' },
    {
      label: 'Zakończ',
      click: () => {
        (global as any).isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
}
