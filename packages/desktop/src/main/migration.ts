import fs from 'fs/promises';
import { execSync } from 'child_process';
import log from 'electron-log/main';
import { safeStorage } from 'electron';
import { store } from './store.js';
import { buildPaths } from './paths.js';
import type { MigrationStatus } from '../shared/types.js';

export async function detect(): Promise<MigrationStatus> {
  if (store.get('legacyMigrated')) {
    return { hasLegacyConfig: false, legacyWorkdir: null };
  }
  const companyName = store.get('companyName');
  const paths = buildPaths(companyName);
  try {
    await fs.access(paths.legacyConfigPath);
    return { hasLegacyConfig: true, legacyWorkdir: paths.workdir };
  } catch {
    return { hasLegacyConfig: false, legacyWorkdir: null };
  }
}

export async function run(): Promise<{ ok: boolean; message: string }> {
  const companyName = store.get('companyName');
  const paths = buildPaths(companyName);

  try {
    const raw = await fs.readFile(paths.legacyConfigPath, 'utf-8');
    const cfg = JSON.parse(raw);
    if (cfg.refreshToken) {
      const enc = safeStorage.isEncryptionAvailable()
        ? safeStorage.encryptString(cfg.refreshToken).toString('base64')
        : Buffer.from(cfg.refreshToken, 'utf-8').toString('base64');
      store.set('authTokenEnc', enc);
    }
    if (cfg.apiBase) store.set('apiBase', cfg.apiBase);
    if (cfg.companyName) store.set('companyName', cfg.companyName);
  } catch (e: any) {
    log.error('Failed to read legacy config', e.message);
    return { ok: false, message: 'Nie udało się odczytać starej konfiguracji' };
  }

  // Wyłącz launchd na macOS
  if (process.platform === 'darwin') {
    try {
      execSync(`launchctl unload "${paths.legacyLaunchAgentPath}" 2>/dev/null || true`);
      await fs.unlink(paths.legacyLaunchAgentPath).catch(() => {});
    } catch {}
  }

  // Wyłącz cron na Linux
  if (process.platform === 'linux') {
    try {
      execSync(`(crontab -l 2>/dev/null | grep -v "fh sync" | crontab -) 2>/dev/null || true`);
    } catch {}
  }

  // Usuń legacy fh CLI
  try {
    await fs.unlink(paths.legacyBinPath).catch(() => {});
  } catch {}

  // Archiwizuj legacy config
  try {
    const ts = Date.now();
    await fs.rename(paths.legacyConfigPath, `${paths.legacyConfigPath}.bak.${ts}`);
  } catch {}

  store.set('legacyMigrated', true);
  log.info('Legacy migration completed');
  return { ok: true, message: 'Stara instalacja przeniesiona' };
}
