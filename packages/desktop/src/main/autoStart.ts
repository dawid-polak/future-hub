import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import log from 'electron-log/main';

export function setAutoStart(enabled: boolean): void {
  if (process.platform === 'linux') {
    void setLinuxAutoStart(enabled);
    return;
  }
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true,
  });
  log.info(`Auto-start set to ${enabled}`);
}

export function getAutoStart(): boolean {
  if (process.platform === 'linux') {
    return existsLinuxAutostart();
  }
  return app.getLoginItemSettings().openAtLogin;
}

async function setLinuxAutoStart(enabled: boolean): Promise<void> {
  const dir = path.join(os.homedir(), '.config', 'autostart');
  const file = path.join(dir, 'future-hub.desktop');
  if (!enabled) {
    try {
      await fs.unlink(file);
    } catch {}
    return;
  }
  try {
    await fs.mkdir(dir, { recursive: true });
    const exec = process.execPath;
    const content = `[Desktop Entry]
Type=Application
Name=Future Hub
Exec=${exec}
X-GNOME-Autostart-enabled=true
NoDisplay=false
Hidden=false
`;
    await fs.writeFile(file, content, 'utf-8');
  } catch (e: any) {
    log.error('Linux autostart setup failed', e.message);
  }
}

function existsLinuxAutostart(): boolean {
  const file = path.join(os.homedir(), '.config', 'autostart', 'future-hub.desktop');
  try {
    require('fs').accessSync(file);
    return true;
  } catch {
    return false;
  }
}
