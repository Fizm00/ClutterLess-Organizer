import { Events } from '@wailsio/runtime';
import * as SystemService from '../../bindings/github.com/Fizm00/organizer/internal/app/systemservice';
import type { Api } from './types';

export const wailsApi: Api = {
  system: {
    async version() {
      const res = await SystemService.Version();
      return {
        version: res.version,
        commit: res.commit,
        buildDate: res.buildDate,
      };
    },
  },
  onTick(callback: (tick: number) => void): () => void {
    return Events.On('tick', (event: any) => {
      if (typeof event?.data === 'number') {
        callback(event.data);
      } else if (event?.data !== undefined) {
        callback(Number(event.data));
      }
    });
  },
};

