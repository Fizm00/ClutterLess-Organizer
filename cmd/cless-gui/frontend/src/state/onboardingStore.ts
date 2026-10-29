// SPDX-License-Identifier: AGPL-3.0-only
import { create } from 'zustand';
import { api, isMockMode } from '../api';
import { useWatchStore } from './watchStore';
import { useFoldersStore } from './foldersStore';
import { useRulesStore } from './rulesStore';
import { useActivityStore } from './activityStore';

export interface PreviewItem {
  name: string;
  dest: string;
  rule: string;
  size: string;
}

interface OnboardingState {
  isFirstRun: boolean | null;
  step: 1 | 2 | 3;
  watchFolders: string[];
  ruleSet: 'recommended' | 'empty';
  autostart: boolean;
  loading: boolean;
  previewFiles: PreviewItem[];

  checkFirstRun: () => Promise<boolean>;
  toggleFolder: (folder: string) => void;
  setRuleSet: (ruleSet: 'recommended' | 'empty') => void;
  setAutostart: (enabled: boolean) => void;
  setStep: (step: 1 | 2 | 3) => void;
  fetchPreview: () => Promise<void>;
  complete: (organizeNow: boolean) => Promise<void>;
  skip: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  isFirstRun: null,
  step: 1,
  watchFolders: ['~/Downloads'],
  ruleSet: 'recommended',
  autostart: false,
  loading: false,
  previewFiles: [],

  checkFirstRun: async () => {
    try {
      const isFirst = await api.config.isFirstRun();
      set({ isFirstRun: isFirst });
      return isFirst;
    } catch {
      set({ isFirstRun: false });
      return false;
    }
  },

  toggleFolder: (folder: string) => {
    const { watchFolders } = get();
    if (watchFolders.includes(folder)) {
      set({ watchFolders: watchFolders.filter(f => f !== folder) });
    } else {
      set({ watchFolders: [...watchFolders, folder] });
    }
  },

  setRuleSet: (ruleSet: 'recommended' | 'empty') => {
    set({ ruleSet });
  },

  setAutostart: (autostart: boolean) => {
    set({ autostart });
  },

  setStep: (step: 1 | 2 | 3) => {
    set({ step });
    if (step === 3) {
      void get().fetchPreview();
    }
  },

  fetchPreview: async () => {
    set({ loading: true });
    try {
      const plan = await api.organize.preview();
      const items: PreviewItem[] = (plan.items || [])
        .filter(m => !m.skipped)
        .slice(0, 5)
        .map(m => ({
          name: m.source.split(/[\\/]/).pop() || m.source,
          dest: m.dest,
          rule: m.ruleName,
          size: '',
        }));
      set({ previewFiles: items, loading: false });
    } catch {
      set({
        previewFiles: isMockMode
          ? [
              { name: 'Financial_Report_Q1.pdf', dest: '~/Documents/Inbox/pdf', rule: 'Documents', size: '2.4 MB' },
              { name: 'Screenshot_2026-04-18.png', dest: '~/Pictures/Sorted/2026', rule: 'Images', size: '1.1 MB' },
              { name: 'Project_Archive.zip', dest: '~/Downloads/_Archives', rule: 'Archives', size: '14.8 MB' },
            ]
          : [],
        loading: false,
      });
    }
  },

  complete: async (organizeNow: boolean) => {
    set({ loading: true });
    const { watchFolders, ruleSet, autostart } = get();
    try {
      // 1. Complete onboarding config in Go backend
      await api.config.completeOnboarding({
        watchFolders: watchFolders.length > 0 ? watchFolders : ['~/Downloads'],
        ruleSet,
        autostart,
      });

      // 2. Set system autostart if opted in
      if (autostart) {
        await api.system.setAutostart(true);
      }

      // 3. If Organize Now is requested, trigger initial run
      if (organizeNow) {
        try {
          await api.organize.run({ selectedIds: [] });
        } catch {
          // non-blocking
        }
      }

      // 4. Start watcher
      try {
        await api.watch.start();
      } catch {
        // non-blocking
      }

      await Promise.all([
        useWatchStore.getState().init(),
        useFoldersStore.getState().fetchFolders(),
        useRulesStore.getState().fetchRules(),
        useActivityStore.getState().init(),
      ]);

      set({ isFirstRun: false, loading: false });
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      set({ loading: false });
    }
  },

  skip: async () => {
    set({ loading: true });
    try {
      await api.config.completeOnboarding({
        watchFolders: ['~/Downloads'],
        ruleSet: 'recommended',
        autostart: false,
      });
      try {
        await api.watch.start();
      } catch {
        // non-blocking
      }
      await Promise.all([
        useWatchStore.getState().init(),
        useFoldersStore.getState().fetchFolders(),
        useRulesStore.getState().fetchRules(),
        useActivityStore.getState().init(),
      ]);
      set({ isFirstRun: false, loading: false });
    } catch {
      set({ isFirstRun: false, loading: false });
    }
  },
}));
