// SPDX-License-Identifier: AGPL-3.0-only
import { create } from 'zustand';
import { api } from '../api';
import { useWatchStore } from './watchStore';

export interface ActivityItem {
  id: string;
  filename: string;
  sourcePath: string;
  destPath: string;
  ruleName: string;
  ruleCategoryIndex: number;
  timestamp: string; // ISO RFC3339 string
  size?: number;
  isNew?: boolean; // Used to trigger CSS entrance animation
}

export interface AttentionItem {
  id: string;
  filename: string;
  sourcePath: string;
  reason: string;
  type: 'skipped' | 'failed';
  timestamp: string;
}

export interface ActivityState {
  recentActivity: ActivityItem[];
  needsAttention: AttentionItem[];
  isLoading: boolean;

  // Actions
  init: () => Promise<void>;
  addFileMoved: (payload: { source: string; dest: string; rule?: string; size?: number; time?: string }) => void;
  addFileSkipped: (payload: { path: string; reason: string }) => void;
  addFileFailed: (payload: { path: string; error: string }) => void;
  dismissAttention: (id: string) => void;
  clearNewFlag: (id: string) => void;
}

// Map rule names to stable category index 0-7
const ruleCategoryMap = new Map<string, number>();
function getRuleCategoryIndex(ruleName: string): number {
  if (!ruleName) return 0;
  if (!ruleCategoryMap.has(ruleName)) {
    ruleCategoryMap.set(ruleName, ruleCategoryMap.size % 8);
  }
  return ruleCategoryMap.get(ruleName)!;
}

function extractFilename(fullPath: string): string {
  if (!fullPath) return '';
  const parts = fullPath.split(/[/\\]/);
  return parts[parts.length - 1] || fullPath;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  recentActivity: [],
  needsAttention: [],
  isLoading: false,

  init: async () => {
    set({ isLoading: true });
    try {
      const batches = await api.history.batches(5);
      if (batches && batches.length > 0) {
        // Fetch detailed records of the most recent batch
        const detail = await api.history.batch(batches[0].id);
        if (detail && detail.records && detail.records.length > 0) {
          const items: ActivityItem[] = detail.records.slice(0, 8).map((rec, idx) => ({
            id: `init-${rec.batchId}-${idx}-${Date.now()}`,
            filename: extractFilename(rec.source),
            sourcePath: rec.source,
            destPath: rec.dest,
            ruleName: rec.rule || 'Default',
            ruleCategoryIndex: getRuleCategoryIndex(rec.rule || 'Default'),
            timestamp: rec.time,
            size: rec.size,
            isNew: false,
          }));

          set({
            recentActivity: items,
            needsAttention: [
              {
                id: 'skip-sample-1',
                filename: 'video_screencast_recording.crdownload',
                sourcePath: 'C:/Users/User/Downloads/video_screencast_recording.crdownload',
                reason: 'still writing',
                type: 'skipped',
                timestamp: new Date().toISOString(),
              },
            ],
            isLoading: false,
          });
          if (items.length > 0) {
            useWatchStore.getState().setLastMovedTime(items[0].timestamp);
          }
          return;
        }
      }
      set({ recentActivity: [], isLoading: false });
    } catch (err) {
      console.error('Failed to load initial history for activity:', err);
      set({ isLoading: false });
    }
  },

  addFileMoved: payload => {
    const time = payload.time || new Date().toISOString();
    const filename = extractFilename(payload.source);
    const newItem: ActivityItem = {
      id: `move-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      filename,
      sourcePath: payload.source,
      destPath: payload.dest,
      ruleName: payload.rule || 'Auto',
      ruleCategoryIndex: getRuleCategoryIndex(payload.rule || 'Auto'),
      timestamp: time,
      size: payload.size,
      isNew: true,
    };

    set(state => {
      const updated = [newItem, ...state.recentActivity].slice(0, 8);
      return { recentActivity: updated };
    });

    // Update last moved time in watch store
    useWatchStore.getState().setLastMovedTime(time);

    // If file was previously in needsAttention, remove it
    set(state => ({
      needsAttention: state.needsAttention.filter(a => a.sourcePath !== payload.source),
    }));
  },

  addFileSkipped: payload => {
    const filename = extractFilename(payload.path);
    const attentionItem: AttentionItem = {
      id: `skip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      filename,
      sourcePath: payload.path,
      reason: payload.reason || 'skipped',
      type: 'skipped',
      timestamp: new Date().toISOString(),
    };

    set(state => ({
      needsAttention: [
        attentionItem,
        ...state.needsAttention.filter(a => a.sourcePath !== payload.path),
      ].slice(0, 5),
    }));
  },

  addFileFailed: payload => {
    const filename = extractFilename(payload.path);
    const attentionItem: AttentionItem = {
      id: `fail-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      filename,
      sourcePath: payload.path,
      reason: payload.error || 'move failed',
      type: 'failed',
      timestamp: new Date().toISOString(),
    };

    set(state => ({
      needsAttention: [
        attentionItem,
        ...state.needsAttention.filter(a => a.sourcePath !== payload.path),
      ].slice(0, 5),
    }));
  },

  dismissAttention: id => {
    set(state => ({
      needsAttention: state.needsAttention.filter(a => a.id !== id),
    }));
  },

  clearNewFlag: id => {
    set(state => ({
      recentActivity: state.recentActivity.map(item =>
        item.id === id ? { ...item, isNew: false } : item
      ),
    }));
  },
}));
