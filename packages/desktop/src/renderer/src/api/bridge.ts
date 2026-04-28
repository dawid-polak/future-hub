import type { FhApi } from '../../../preload/index.js';

declare global {
  interface Window {
    fh: FhApi;
  }
}

export const fh: FhApi = window.fh;
