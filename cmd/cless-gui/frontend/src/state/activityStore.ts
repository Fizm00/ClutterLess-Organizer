// SPDX-License-Identifier: AGPL-3.0-only
import { create } from 'zustand';
import { api, isMockMode } from '../api';
import { BatchDetailDTO, BatchSummaryDTO, HistoryFilterDTO } from '../api/types';
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
  batches: BatchSummaryDTO[];
  batchDetails: Record<string, BatchDetailDTO>;
  expandedBatchIds: Record<string, boolean>;
  isLoading: boolean;

  // Actions
  init: () => Promise<void>;
  loadBatches: (limit?: number, filter?: HistoryFilterDTO) => Promise<void>;
  toggleBatchExpanded: (id: string) => Promise<void>;
  retryFile: (path: string) => Promise<boolean>;
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
  batches: [],
  batchDetails: {},
  expandedBatchIds: {},
  isLoading: false,

  init: async () => {
    set({ isLoading: true });
    try {
      const batches = await api.history.batches(50);
      set({ batches: batches || [] });

      if (batches && batches.length > 0) {
        // Fetch detailed records of the most recent batch for Overview
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

          set(state => ({
            recentActivity: items,
            batchDetails: {
              ...state.batchDetails,
              [batches[0].id]: detail,
            },
            needsAttention: isMockMode
              ? [
                  {
                    id: 'skip-sample-1',
                    filename: 'video_screencast_recording.crdownload',
                    sourcePath: 'C:/Users/User/Downloads/video_screencast_recording.crdownload',
                    reason: 'still writing',
                    type: 'skipped',
                    timestamp: new Date().toISOString(),
                  },
                ]
              : state.needsAttention,
            isLoading: false,
          }));

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

  loadBatches: async (limit = 100, filter) => {
    set({ isLoading: true });
    try {
      const batches = await api.history.batches(limit, filter);
      set({ batches: batches || [], isLoading: false });
    } catch (err) {
      console.error('Failed to query batches:', err);
      set({ isLoading: false });
    }
  },

  toggleBatchExpanded: async (id: string) => {
    const isCurrentlyExpanded = !!get().expandedBatchIds[id];
    set(state => ({
      expandedBatchIds: {
        ...state.expandedBatchIds,
        [id]: !isCurrentlyExpanded,
      },
    }));

    // If opening and details not yet cached, fetch them
    if (!isCurrentlyExpanded && !get().batchDetails[id]) {
      try {
        const detail = await api.history.batch(id);
        set(state => ({
          batchDetails: {
            ...state.batchDetails,
            [id]: detail,
          },
        }));
      } catch (err) {
        console.error(`Failed to load batch detail for ${id}:`, err);
      }
    }
  },

  retryFile: async (path: string) => {
    try {
      const res = await api.organize.retryFile(path);
      if (!res.failed) {
        // Remove from needsAttention
        set(state => ({
          needsAttention: state.needsAttention.filter(a => a.sourcePath !== path),
        }));
        // Reload history
        await get().loadBatches();
        return true;
      }
      return false;
    } catch (err) {
      console.error(`Failed to retry file ${path}:`, err);
      return false;
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

    // Refresh batch list
    void get().loadBatches();
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
