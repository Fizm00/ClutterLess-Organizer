// SPDX-License-Identifier: AGPL-3.0-only
import type { Api } from './types';
import { mockApi } from './mock';
import { wailsApi } from './wails';

// Only use mockApi when explicitly running Vite in mock mode (`npm run dev:mock`)
// or inside Vitest unit tests (`npm test`). Production and Wails dev builds
// always connect to the real Go backend via Wails v3 bindings.
export const isMockMode =
  import.meta.env.MODE === 'mock' || import.meta.env.MODE === 'test';

export const api: Api = isMockMode ? mockApi : wailsApi;

export * from './types';
export { mockApi, wailsApi };
