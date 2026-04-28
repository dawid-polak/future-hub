import log from 'electron-log/main';
import * as sync from './sync.js';
import { store } from './store.js';

let timer: NodeJS.Timeout | null = null;

export function start(): void {
  stop();
  const minutes = store.get('syncIntervalMinutes') || 10;
  const ms = minutes * 60 * 1000;
  log.info(`Scheduler started: every ${minutes} min`);

  // Pierwszy sync po 5s od startu
  setTimeout(() => {
    void sync.run();
  }, 5000);

  timer = setInterval(() => {
    void sync.run();
  }, ms);
}

export function stop(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function restart(): void {
  start();
}

export async function runNow(): Promise<void> {
  await sync.run();
}
