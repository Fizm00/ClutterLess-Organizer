// SPDX-License-Identifier: AGPL-3.0-only
import { describe, it, expect, beforeEach } from 'vitest';
import { useWatchStore } from './watchStore';

describe('useWatchStore', () => {
  beforeEach(() => {
    useWatchStore.setState({
      running: false,
      folders: [],
      error: null,
      watcherLocked: false,
      configError: null,
      lastMovedTime: null,
      isLoading: false,
    });
  });

  it('updates state via setStatus', () => {
    useWatchStore.getState().setStatus({
      running: true,
      folders: ['C:/Users/User/Downloads'],
    });

    const state = useWatchStore.getState();
    expect(state.running).toBe(true);
    expect(state.folders).toEqual(['C:/Users/User/Downloads']);
    expect(state.error).toBeNull();
    expect(state.watcherLocked).toBe(false);
  });

  it('detects watcher locked condition in status error', () => {
    useWatchStore.getState().setStatus({
      running: false,
      folders: [],
      error: 'watcher is already running in another active process (PID: 1234)',
    });

    const state = useWatchStore.getState();
    expect(state.running).toBe(false);
    expect(state.watcherLocked).toBe(true);
    expect(state.error).toBeNull();
  });

  it('sets configError and clearConfigError correctly', () => {
    useWatchStore.getState().setConfigError({
      path: 'config.yaml',
      message: 'yaml: line 12: mapping values are not allowed in this context',
      line: 12,
    });

    expect(useWatchStore.getState().configError).toEqual({
      path: 'config.yaml',
      message: 'yaml: line 12: mapping values are not allowed in this context',
      line: 12,
    });

    useWatchStore.getState().setConfigError(null);
    expect(useWatchStore.getState().configError).toBeNull();
  });
});
