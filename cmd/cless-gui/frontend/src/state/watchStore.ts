// SPDX-License-Identifier: AGPL-3.0-only
import { create } from 'zustand';
import { api } from '../api';
import type { WatchStatusDTO } from '../api/types';

export interface ConfigErrorInfo {
  path: string;
  message: string;
  line?: number;
}

export interface WatchState {
  running: boolean;
  folders: string[];
  error: string | null;
  watcherLocked: boolean;
  configError: ConfigErrorInfo | null;
  lastMovedTime: string | null;
  isLoading: boolean;

  // Actions
  init: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  retry: () => Promise<void>;
  openConfigFile: () => Promise<void>;
  setStatus: (status: WatchStatusDTO) => void;
  setLastMovedTime: (timeIso: string) => void;
  setConfigError: (error: ConfigErrorInfo | null) => void;
  setWatcherLocked: (locked: boolean) => void;
}

export const useWatchStore = create<WatchState>((set, get) => ({
  running: false,
  folders: [],
  error: null,
  watcherLocked: false,
  configError: null,
  lastMovedTime: null,
  isLoading: false,

  init: async () => {
    set({ isLoading: true });
    try {
      const cfg = await api.config.get();
      const initialFolders = cfg?.watch?.map(w => w.path) || [];
      const status = await api.watch.status();

      const isLocked =
        Boolean(status.error && status.error.toLowerCase().includes('watcher is already running')) ||
        Boolean(status.error && status.error.toLowerCase().includes('watcher_already_running'));

      set({
        running: status.running,
        folders: status.folders?.length ? status.folders : initialFolders,
        error: isLocked ? null : status.error || null,
        watcherLocked: isLocked,
        isLoading: false,
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isLocked =
        errMsg.toLowerCase().includes('watcher is already running') ||
        errMsg.toLowerCase().includes('watcher_already_running');

      set({
        error: isLocked ? null : errMsg,
        watcherLocked: isLocked,
        isLoading: false,
      });
    }
  },

  start: async () => {
    set({ isLoading: true });
    try {
      await api.watch.start();
      const status = await api.watch.status();
      set({
        running: status.running,
        folders: status.folders,
        error: null,
        watcherLocked: false,
        isLoading: false,
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isLocked =
        errMsg.toLowerCase().includes('watcher is already running') ||
        errMsg.toLowerCase().includes('watcher_already_running');

      set({
        error: isLocked ? null : errMsg,
        watcherLocked: isLocked,
        isLoading: false,
      });
    }
  },

  stop: async () => {
    set({ isLoading: true });
    try {
      await api.watch.stop();
      set({
        running: false,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err?.message || String(err),
        isLoading: false,
      });
    }
  },

  retry: async () => {
    const { configError, watcherLocked } = get();
    if (configError) {
      try {
        // Test config
        const cfg = await api.config.get();
        set({
          configError: null,
          folders: cfg?.watch?.map(w => w.path) || get().folders,
        });
      } catch (err: any) {
        // Still invalid
        return;
      }
    }
    if (watcherLocked || !get().running) {
      await get().start();
    }
  },

  openConfigFile: async () => {
    try {
      await api.system.openConfig();
    } catch (err) {
      console.error('Failed to open config file:', err);
    }
  },

  setStatus: (status: WatchStatusDTO) => {
    const isLocked =
      Boolean(status.error && status.error.toLowerCase().includes('watcher is already running')) ||
      Boolean(status.error && status.error.toLowerCase().includes('watcher_already_running'));

    set(state => ({
      running: status.running,
      folders: status.folders?.length ? status.folders : state.folders,
      error: isLocked ? null : status.error || null,
      watcherLocked: isLocked,
    }));
  },

  setLastMovedTime: (timeIso: string) => {
    set({ lastMovedTime: timeIso });
  },

  setConfigError: (error: ConfigErrorInfo | null) => {
    set({ configError: error });
  },

  setWatcherLocked: (locked: boolean) => {
    set({ watcherLocked: locked });
  },
}));

