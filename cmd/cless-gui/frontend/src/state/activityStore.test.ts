// SPDX-License-Identifier: AGPL-3.0-only
import { describe, it, expect, beforeEach } from 'vitest';
import { useActivityStore } from './activityStore';
import { useWatchStore } from './watchStore';

describe('useActivityStore', () => {
  beforeEach(() => {
    useActivityStore.setState({
      recentActivity: [],
      needsAttention: [],
      isLoading: false,
    });
    useWatchStore.setState({
      lastMovedTime: null,
    });
  });

  it('prepends moved file to recentActivity and updates watchStore lastMovedTime', () => {
    useActivityStore.getState().addFileMoved({
      source: 'C:/Downloads/report.pdf',
      dest: 'C:/Documents/Finance/report.pdf',
      rule: 'Invoices',
      size: 1024,
      time: '2026-04-18T14:22:00Z',
    });

    const state = useActivityStore.getState();
    expect(state.recentActivity).toHaveLength(1);
    expect(state.recentActivity[0].filename).toBe('report.pdf');
    expect(state.recentActivity[0].ruleName).toBe('Invoices');
    expect(state.recentActivity[0].destPath).toBe('C:/Documents/Finance/report.pdf');
    expect(state.recentActivity[0].isNew).toBe(true);

    // Verifies lastMovedTime in watchStore is updated
    expect(useWatchStore.getState().lastMovedTime).toBe('2026-04-18T14:22:00Z');
  });

  it('limits recentActivity to maximum 8 items', () => {
    for (let i = 1; i <= 12; i++) {
      useActivityStore.getState().addFileMoved({
        source: `C:/Downloads/file_${i}.txt`,
        dest: `C:/Documents/file_${i}.txt`,
        rule: 'Docs',
        time: new Date().toISOString(),
      });
    }

    const state = useActivityStore.getState();
    expect(state.recentActivity).toHaveLength(8);
    expect(state.recentActivity[0].filename).toBe('file_12.txt');
  });

  it('adds skipped and failed files to needsAttention', () => {
    useActivityStore.getState().addFileSkipped({
      path: 'C:/Downloads/video.crdownload',
      reason: 'still writing',
    });

    useActivityStore.getState().addFileFailed({
      path: 'C:/Downloads/locked.xlsx',
      error: 'file is locked by Excel',
    });

    const state = useActivityStore.getState();
    expect(state.needsAttention).toHaveLength(2);
    expect(state.needsAttention[0].filename).toBe('locked.xlsx');
    expect(state.needsAttention[0].type).toBe('failed');
    expect(state.needsAttention[1].filename).toBe('video.crdownload');
    expect(state.needsAttention[1].type).toBe('skipped');

    // Dismiss one item
    useActivityStore.getState().dismissAttention(state.needsAttention[0].id);
    expect(useActivityStore.getState().needsAttention).toHaveLength(1);
    expect(useActivityStore.getState().needsAttention[0].filename).toBe('video.crdownload');
  });
});
