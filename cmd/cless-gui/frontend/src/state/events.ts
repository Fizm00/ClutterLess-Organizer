// SPDX-License-Identifier: AGPL-3.0-only
import { api } from '../api';
import { useWatchStore } from './watchStore';
import { useActivityStore } from './activityStore';
import { useRulesStore } from './rulesStore';
import { useFoldersStore } from './foldersStore';
import { toast } from 'sonner';
import { t } from '../i18n';

let cleanupFn: (() => void) | null = null;

export function setupEventSubscriptions(): () => void {
  if (cleanupFn) {
    cleanupFn();
    cleanupFn = null;
  }

  const unsubWatch = api.onEvent('watch:status', payload => {
    if (payload) {
      useWatchStore.getState().setStatus(payload);
    }
  });

  const unsubMoved = api.onEvent('file:moved', payload => {
    if (payload) {
      useActivityStore.getState().addFileMoved(payload);
    }
  });

  const unsubSkipped = api.onEvent('file:skipped', payload => {
    if (payload) {
      useActivityStore.getState().addFileSkipped(payload);
    }
  });

  const unsubFailed = api.onEvent('file:failed', payload => {
    if (payload) {
      useActivityStore.getState().addFileFailed(payload);
    }
  });

  const unsubConfig = api.onEvent('config:changed', _payload => {
    toast(t('toast.config_reloaded'));
    useWatchStore.getState().init();
    useRulesStore.getState().fetchRules();
    useFoldersStore.getState().fetchFolders();
    if (useRulesStore.getState().editingRule) {
      useRulesStore.getState().setExternalChangeDetected(true);
    }
  });

  const unsubError = api.onEvent('app:error', payload => {
    if (!payload) return;
    const code = payload.code || '';
    const message = payload.message || '';
    const details = payload.details || '';

    if (code === 'CONFIG_INVALID') {
      let line: number | undefined;
      const lineMatch = details.match(/line (\d+)/i) || message.match(/line (\d+)/i);
      if (lineMatch) {
        line = parseInt(lineMatch[1], 10);
      }
      useWatchStore.getState().setConfigError({
        path: payload.path || 'config.yaml',
        message: details || message,
        line,
      });
    } else if (code === 'WATCHER_ALREADY_RUNNING') {
      useWatchStore.getState().setWatcherLocked(true);
    }
  });

  cleanupFn = () => {
    unsubWatch();
    unsubMoved();
    unsubSkipped();
    unsubFailed();
    unsubConfig();
    unsubError();
  };

  return cleanupFn;
}

