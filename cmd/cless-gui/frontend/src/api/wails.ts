// SPDX-License-Identifier: AGPL-3.0-only
import { Events } from '@wailsio/runtime';
import * as SystemService from '../../bindings/github.com/Fizm00/organizer/internal/app/systemservice';
import type { Api } from './types';
import { mockApi } from './mock';

export const wailsApi: Api = {
  config: mockApi.config,
  rules: mockApi.rules,
  organize: mockApi.organize,
  history: mockApi.history,
  watch: mockApi.watch,
  system: {
    async version() {
      try {
        const res = await SystemService.Version();
        return {
          version: res.version,
          commit: res.commit,
          buildDate: res.buildDate,
        };
      } catch {
        return mockApi.system.version();
      }
    },
    revealPath: mockApi.system.revealPath,
    openConfig: mockApi.system.openConfig,
    pickFolder: mockApi.system.pickFolder,
    setAutostart: mockApi.system.setAutostart,
    getAutostart: mockApi.system.getAutostart,
  },
  onEvent(name: string, callback: (payload: any) => void): () => void {
    return Events.On(name, (event: any) => {
      callback(event?.data);
    });
  },
};
