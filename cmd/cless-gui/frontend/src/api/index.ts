// SPDX-License-Identifier: AGPL-3.0-only
import { Api } from './types';
import { mockApi } from './mock';
import { wailsApi } from './wails';

// Auto-select mock API when running without Wails runtime or in mock mode
const isWails = typeof window !== 'undefined' && Boolean((window as any).wails);
const isMockMode = import.meta.env.MODE === 'mock' || !isWails;

export const api: Api = isMockMode ? mockApi : wailsApi;

export * from './types';
