// SPDX-License-Identifier: AGPL-3.0-only
import { describe, it, expect, beforeEach } from 'vitest';
import { setupEventSubscriptions } from './events';
import { useWatchStore } from './watchStore';
import { useActivityStore } from './activityStore';
import { api } from '../api';

describe('Event Subscriptions', () => {
  beforeEach(() => {
    useWatchStore.setState({
      running: false,
      folders: [],
      watcherLocked: false,
      configError: null,
    });
    useActivityStore.setState({
      recentActivity: [],
      needsAttention: [],
    });
  });

  it('routes watch:status event to watchStore', () => {
    const cleanup = setupEventSubscriptions();

    // Trigger mock event
    (api as any).emit('watch:status', {
      running: true,
      folders: ['C:/Watched'],
    });

    expect(useWatchStore.getState().running).toBe(true);
    expect(useWatchStore.getState().folders).toEqual(['C:/Watched']);

    cleanup();
  });

  it('routes file:moved event to activityStore', () => {
    const cleanup = setupEventSubscriptions();

    (api as any).emit('file:moved', {
      source: 'C:/Downloads/photo.jpg',
      dest: 'C:/Pictures/photo.jpg',
      rule: 'Images',
    });

    expect(useActivityStore.getState().recentActivity).toHaveLength(1);
    expect(useActivityStore.getState().recentActivity[0].filename).toBe('photo.jpg');

    cleanup();
  });

  it('routes app:error CONFIG_INVALID to watchStore', () => {
    const cleanup = setupEventSubscriptions();

    (api as any).emit('app:error', {
      code: 'CONFIG_INVALID',
      message: 'syntax error',
      details: 'yaml: line 8: error parsing',
      path: 'config.yaml',
    });

    expect(useWatchStore.getState().configError).toBeDefined();
    expect(useWatchStore.getState().configError?.line).toBe(8);

    cleanup();
  });
});
