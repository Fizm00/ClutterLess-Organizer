import type { Api } from './types';

export const mockApi: Api = {
  system: {
    async version() {
      return {
        version: '0.3.0-mock',
        commit: 'mock-commit-8f42a1',
        buildDate: '2026-10-28T17:00:00Z',
      };
    },
  },
  onTick(callback: (tick: number) => void): () => void {
    let tickCount = 0;
    const timer = setInterval(() => {
      tickCount++;
      callback(tickCount);
    }, 1000);
    return () => clearInterval(timer);
  },
};

