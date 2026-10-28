// SPDX-License-Identifier: AGPL-3.0-only
import { create } from 'zustand';
import { api } from '../api';
import type { WatchEntryDTO, FolderWarningDTO } from '../api/types';
import { toast } from 'sonner';
import { t } from '../i18n';

interface FoldersState {
  folders: WatchEntryDTO[];
  fileCounts: Record<string, number | 'counting' | 'error'>;
  warnings: FolderWarningDTO[];
  loading: boolean;
  error: string | null;

  fetchFolders: () => Promise<void>;
  fetchCounts: () => Promise<void>;
  fetchWarnings: () => Promise<void>;
  addFolder: () => Promise<string | null>;
  removeFolder: (path: string) => Promise<boolean>;
  toggleRecursive: (path: string) => Promise<void>;
  revealFolder: (path: string) => Promise<void>;
}

export const useFoldersStore = create<FoldersState>((set, get) => ({
  folders: [],
  fileCounts: {},
  warnings: [],
  loading: false,
  error: null,

  fetchFolders: async () => {
    set({ loading: true, error: null });
    try {
      const cfg = await api.config.get();
      set({ folders: cfg.watch || [], loading: false });
      void get().fetchCounts();
      void get().fetchWarnings();
    } catch (err: any) {
      set({ error: err?.message || 'Failed to load folders', loading: false });
    }
  },

  fetchCounts: async () => {
    const folders = get().folders;
    const initialCounts: Record<string, number | 'counting' | 'error'> = { ...get().fileCounts };
    for (const f of folders) {
      if (initialCounts[f.path] === undefined) {
        initialCounts[f.path] = 'counting';
      }
    }
    set({ fileCounts: initialCounts });

    // Fetch asynchronously without blocking UI
    for (const f of folders) {
      try {
        const count = await api.system.countFiles(f.path);
        set(state => ({
          fileCounts: { ...state.fileCounts, [f.path]: count },
        }));
      } catch {
        set(state => ({
          fileCounts: { ...state.fileCounts, [f.path]: 'error' },
        }));
      }
    }
  },

  fetchWarnings: async () => {
    try {
      const warnings = await api.config.getFolderWarnings();
      set({ warnings });
    } catch {
      set({ warnings: [] });
    }
  },

  addFolder: async () => {
    try {
      const selected = await api.system.pickFolder();
      if (!selected) return null;

      const cfg = await api.config.get();
      const exists = cfg.watch.some(w => w.path.toLowerCase() === selected.toLowerCase());
      if (exists) {
        toast('Folder is already in the watch list.');
        return selected;
      }

      const updatedWatch = [...cfg.watch, { path: selected, recursive: false }];
      await api.config.save({ ...cfg, watch: updatedWatch });
      toast(t('toast.folder_added'));
      await get().fetchFolders();
      return selected;
    } catch (err: any) {
      toast('Failed to add folder: ' + (err?.message || ''));
      return null;
    }
  },

  removeFolder: async (path: string) => {
    try {
      const cfg = await api.config.get();
      const updatedWatch = cfg.watch.filter(w => w.path.toLowerCase() !== path.toLowerCase());
      await api.config.save({ ...cfg, watch: updatedWatch });
      toast(t('toast.folder_removed'));
      await get().fetchFolders();
      return true;
    } catch (err: any) {
      toast('Failed to remove folder: ' + (err?.message || ''));
      return false;
    }
  },

  toggleRecursive: async (path: string) => {
    try {
      const cfg = await api.config.get();
      const updatedWatch = cfg.watch.map(w => {
        if (w.path.toLowerCase() === path.toLowerCase()) {
          return { ...w, recursive: !w.recursive };
        }
        return w;
      });
      await api.config.save({ ...cfg, watch: updatedWatch });
      await get().fetchFolders();
    } catch (err: any) {
      toast('Failed to update folder setting: ' + (err?.message || ''));
    }
  },

  revealFolder: async (path: string) => {
    try {
      await api.system.revealPath(path);
    } catch (err: any) {
      toast('Failed to open folder: ' + (err?.message || ''));
    }
  },
}));
