import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import log from 'electron-log/main';
import { BrowserWindow } from 'electron';
import { store } from './store.js';
import { buildPaths } from './paths.js';
import { getAccessToken, logout } from './auth.js';
import { IPC } from '../shared/ipcChannels.js';
import type { InstallerSkill, SyncProgress } from '../shared/types.js';

let currentState: SyncProgress = {
  state: 'idle',
  message: 'Brak synchronizacji',
  added: 0,
  removed: 0,
  total: 0,
  lastSyncAt: store.get('lastSyncAt'),
};

let running = false;

function emit(progress: Partial<SyncProgress>) {
  currentState = { ...currentState, ...progress };
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC.SYNC_PROGRESS, currentState);
  }
}

export function getStatus(): SyncProgress {
  return currentState;
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function listLocalSkillSlugs(skillsDir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(skillsDir);
    return files.filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
  } catch {
    return [];
  }
}

export async function run(): Promise<void> {
  if (running) {
    log.info('Sync already running, skipping');
    return;
  }
  running = true;
  emit({ state: 'running', message: 'Synchronizuję...', added: 0, removed: 0, error: undefined });

  const apiBase = store.get('apiBase');
  const companyName = store.get('companyName');
  const paths = buildPaths(companyName);

  try {
    const token = await getAccessToken();
    if (!token) {
      log.warn('No access token — clearing local skills');
      try {
        const slugs = await listLocalSkillSlugs(paths.skillsDir);
        for (const slug of slugs) {
          await fs.unlink(path.join(paths.skillsDir, `${slug}.md`));
        }
      } catch {}
      logout();
      emit({ state: 'error', message: 'Sesja wygasła', error: 'Zaloguj się ponownie' });
      return;
    }

    await ensureDir(paths.skillsDir);
    await ensureDir(paths.docsDir);

    // README z onboardingiem
    try {
      const readme = await axios.get(`${apiBase}/api/installer/onboarding.md`, {
        responseType: 'text',
        timeout: 15000,
      });
      await fs.writeFile(paths.readmePath, readme.data, 'utf-8');
    } catch (e: any) {
      log.warn('Failed to fetch onboarding.md', e.message);
    }

    const { data: skills } = await axios.get<InstallerSkill[]>(`${apiBase}/api/installer/skills/me`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
    });

    const remoteSlugs = new Set(skills.map((s) => s.slug));
    const localSlugs = await listLocalSkillSlugs(paths.skillsDir);

    let removed = 0;
    for (const slug of localSlugs) {
      if (!remoteSlugs.has(slug)) {
        await fs.unlink(path.join(paths.skillsDir, `${slug}.md`));
        removed++;
        log.info(`Removed skill: ${slug}`);
      }
    }

    let added = 0;
    for (const skill of skills) {
      const filePath = path.join(paths.skillsDir, skill.filename);
      await fs.writeFile(filePath, skill.markdown, 'utf-8');
      added++;
    }

    const now = Date.now();
    store.set('lastSyncAt', now);
    emit({
      state: 'success',
      message: `Zsynchronizowano ${added} skili`,
      added,
      removed,
      total: skills.length,
      lastSyncAt: now,
    });
    log.info(`Sync OK: ${added} added/updated, ${removed} removed, total ${skills.length}`);
  } catch (e: any) {
    const msg = e?.response?.data?.error || e.message || 'Nieznany błąd';
    log.error('Sync failed', msg);
    emit({ state: 'error', message: 'Synchronizacja nieudana', error: msg });
  } finally {
    running = false;
  }
}

export async function clearLocalWorkdir(): Promise<void> {
  const companyName = store.get('companyName');
  const paths = buildPaths(companyName);
  try {
    await fs.rm(paths.workdir, { recursive: true, force: true });
    log.info(`Removed workdir: ${paths.workdir}`);
  } catch (e: any) {
    log.warn('Failed to remove workdir', e.message);
  }
}
