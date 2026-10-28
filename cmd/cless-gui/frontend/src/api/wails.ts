// SPDX-License-Identifier: AGPL-3.0-only
import { Events } from '@wailsio/runtime';
import * as SystemService from '../../bindings/github.com/Fizm00/organizer/internal/app/systemservice';
import * as ConfigService from '../../bindings/github.com/Fizm00/organizer/internal/app/configservice';
import * as RulesService from '../../bindings/github.com/Fizm00/organizer/internal/app/rulesservice';
import * as OrganizeService from '../../bindings/github.com/Fizm00/organizer/internal/app/organizeservice';
import * as HistoryService from '../../bindings/github.com/Fizm00/organizer/internal/app/historyservice';
import * as WatchService from '../../bindings/github.com/Fizm00/organizer/internal/app/watchservice';
import type { Api } from './types';
import { mockApi } from './mock';

export const wailsApi: Api = {
  config: {
    async get() {
      return (await ConfigService.Get()) as any;
    },
    async validate(dto) {
      return (await ConfigService.Validate(dto as any)) as any;
    },
    async save(dto) {
      return ConfigService.Save(dto as any);
    },
    async path() {
      return ConfigService.Path();
    },
    async resetToDefaults() {
      return ConfigService.ResetToDefaults();
    },
    async getFolderWarnings() {
      const cfg: any = ConfigService;
      if (typeof cfg?.GetFolderWarnings === 'function') {
        return (await cfg.GetFolderWarnings()) as any;
      }
      return mockApi.config.getFolderWarnings();
    },
  },
  rules: {
    async list() {
      return (await RulesService.List()) as any;
    },
    async upsert(rule) {
      return RulesService.Upsert(rule as any);
    },
    async delete(name) {
      return RulesService.Delete(name);
    },
    async reorder(names) {
      return RulesService.Reorder(names);
    },
    async test(filename) {
      return (await RulesService.Test(filename)) as any;
    },
    async testRule(rule, filename) {
      const rs: any = RulesService;
      if (typeof rs?.TestRule === 'function') {
        return (await rs.TestRule(rule as any, filename)) as any;
      }
      return mockApi.rules.testRule(rule, filename);
    },
  },
  organize: {
    async preview(opts) {
      return (await OrganizeService.Preview((opts || {}) as any)) as any;
    },
    async run(req) {
      return (await OrganizeService.Run(req as any)) as any;
    },
    async retryFile(sourcePath) {
      const org: any = OrganizeService;
      if (typeof org?.RetryFile === 'function') {
        return (await org.RetryFile(sourcePath)) as any;
      }
      return mockApi.organize.retryFile(sourcePath);
    },
  },
  history: {
    async batches(limit = 50, filter = {}) {
      return (await HistoryService.Batches(limit, filter as any)) as any;
    },
    async batch(id) {
      return (await HistoryService.Batch(id)) as any;
    },
    async undoPreview(batchId) {
      return (await HistoryService.UndoPreview(batchId)) as any;
    },
    async undo(batchId) {
      return (await HistoryService.Undo(batchId)) as any;
    },
  },
  watch: {
    async start() {
      return WatchService.Start();
    },
    async stop() {
      return WatchService.Stop();
    },
    async status() {
      return (await WatchService.Status()) as any;
    },
    async reload() {
      return WatchService.Reload();
    },
  },
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
    async revealPath(path: string) {
      return SystemService.RevealPath(path);
    },
    async openConfig() {
      return SystemService.OpenConfig();
    },
    async pickFolder() {
      const sys: any = SystemService;
      if (typeof sys?.PickFolder === 'function') {
        return (await sys.PickFolder()) as any;
      }
      return mockApi.system.pickFolder();
    },
    async countFiles(folderPath: string) {
      const sys: any = SystemService;
      if (typeof sys?.CountFiles === 'function') {
        return (await sys.CountFiles(folderPath)) as any;
      }
      return mockApi.system.countFiles(folderPath);
    },
    setAutostart: mockApi.system.setAutostart,
    getAutostart: mockApi.system.getAutostart,
  },
  onEvent(name: string, callback: (payload: any) => void): () => void {
    return Events.On(name, (event: any) => {
      callback(event?.data);
    });
  },
};
