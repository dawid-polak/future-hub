import { safeStorage } from 'electron';
import axios from 'axios';
import log from 'electron-log/main';
import { store } from './store.js';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { name: string; email: string };
}

let cachedAccessToken: string | null = null;
let accessTokenExpiry: number = 0;

function saveRefreshToken(refresh: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    log.warn('safeStorage encryption unavailable — token saved unencrypted (debug mode only)');
    store.set('authTokenEnc', Buffer.from(refresh, 'utf-8').toString('base64'));
    return;
  }
  const enc = safeStorage.encryptString(refresh);
  store.set('authTokenEnc', enc.toString('base64'));
}

function loadRefreshToken(): string | null {
  const enc = store.get('authTokenEnc');
  if (!enc) return null;
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return Buffer.from(enc, 'base64').toString('utf-8');
    }
    return safeStorage.decryptString(Buffer.from(enc, 'base64'));
  } catch (e) {
    log.error('Failed to decrypt refresh token', e);
    return null;
  }
}

export function isAuthenticated(): boolean {
  return loadRefreshToken() !== null;
}

export function getAuthStatus() {
  return {
    authenticated: isAuthenticated(),
    email: store.get('userEmail'),
    userName: store.get('userName'),
  };
}

export async function login(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiBase = store.get('apiBase');
  try {
    const { data } = await axios.post<LoginResponse>(
      `${apiBase}/api/auth/login`,
      { email, password },
      { timeout: 15000 }
    );
    saveRefreshToken(data.refreshToken);
    cachedAccessToken = data.accessToken;
    accessTokenExpiry = Date.now() + 14 * 60 * 1000;
    store.set('userEmail', data.user.email);
    store.set('userName', data.user.name);
    log.info(`Logged in as ${data.user.email}`);
    return { ok: true };
  } catch (e: any) {
    const msg = e?.response?.data?.error || e.message || 'Nieznany błąd';
    log.error('Login failed', msg);
    return { ok: false, error: msg };
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (cachedAccessToken && Date.now() < accessTokenExpiry) {
    return cachedAccessToken;
  }
  const refresh = loadRefreshToken();
  if (!refresh) return null;
  const apiBase = store.get('apiBase');
  try {
    const { data } = await axios.post<{ accessToken: string }>(
      `${apiBase}/api/auth/refresh`,
      { refreshToken: refresh },
      { timeout: 15000 }
    );
    cachedAccessToken = data.accessToken;
    accessTokenExpiry = Date.now() + 14 * 60 * 1000;
    return cachedAccessToken;
  } catch (e: any) {
    log.error('Refresh failed', e?.response?.data?.error || e.message);
    return null;
  }
}

export function logout(): void {
  cachedAccessToken = null;
  accessTokenExpiry = 0;
  store.set('authTokenEnc', null);
  store.set('userEmail', null);
  store.set('userName', null);
  store.set('lastSyncAt', null);
  log.info('Logged out');
}
