import type { Api } from './types';
import { mockApi } from './mock';
import { wailsApi } from './wails';

const isMock =
  import.meta.env.MODE === 'mock' ||
  typeof (window as any)._wails === 'undefined';

export const api: Api = isMock ? mockApi : wailsApi;
export const isMockMode: boolean = isMock;

export * from './types';

