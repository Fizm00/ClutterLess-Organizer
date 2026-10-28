// SPDX-License-Identifier: AGPL-3.0-only
import React, { useEffect } from 'react';
import {
  StatusDot,
  Path,
  FileRow,
  ListRow,
  EmptyState,
  Button,
  Badge,
} from '../../components';
import { Folder, ArrowRight, AlertCircle, X } from 'lucide-react';
import { useWatchStore } from '../../state/watchStore';
import { useActivityStore } from '../../state/activityStore';
import { formatRelativeTime, formatAbsoluteTime } from '../../utils/time';
import { useTick } from '../../utils/useTick';
import { Tooltip } from '../../components/Tooltip';
import { t } from '../../i18n';
import { api } from '../../api';

export interface OverviewProps {
  onNavigate?: (route: any) => void;
  onOrganizeNow?: () => void;
}

export const Overview: React.FC<OverviewProps> = ({ onNavigate, onOrganizeNow }) => {
  const {
    running,
    folders,
    watcherLocked,
    configError,
    lastMovedTime,
    retry,
    openConfigFile,
  } = useWatchStore();

  const {
    recentActivity,
    needsAttention,
    dismissAttention,
    clearNewFlag,
  } = useActivityStore();

  // Ticker to update relative timestamps every 30s
  useTick(30000);

  // Clear entrance animation flags after animation finishes
  useEffect(() => {
    const newItems = recentActivity.filter(item => item.isNew);
    if (newItems.length > 0) {
      const timer = setTimeout(() => {
        newItems.forEach(item => clearNewFlag(item.id));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [recentActivity, clearNewFlag]);

  // Status line text computation
  const getStatusText = () => {
    if (watcherLocked || configError) {
      return t('watch.status.error');
    }
    if (!running) {
      return t('overview.status.paused');
    }
    const count = folders.length;
    if (lastMovedTime) {
      const relTime = formatRelativeTime(lastMovedTime);
      return t('overview.status.watching_with_time', { count, time: relTime });
    }
    return t('overview.status.watching_idle', { count });
  };

  const statusState = watcherLocked || configError ? 'error' : running ? 'watching' : 'paused';

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. Error Banners (DESIGN.md section 7.10) */}
      {configError && (
        <div
          role="alert"
          className="flex items-center justify-between p-3 bg-bg-surface border border-border border-l-2 border-l-danger rounded-md gap-4 w-full"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-sans text-body font-semibold text-text-1">
                {configError.line
                  ? t('error.config_invalid_line', {
                      path: configError.path,
                      line: configError.line,
                      message: configError.message,
                    })
                  : t('error.config_invalid', { path: configError.path })}
              </span>
              <span className="font-sans text-small text-text-2">{configError.message}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" onClick={openConfigFile}>
              {t('action.open_config')}
            </Button>
            <Button variant="secondary" onClick={retry}>
              {t('action.retry')}
            </Button>
          </div>
        </div>
      )}

      {watcherLocked && (
        <div
          role="alert"
          className="flex items-center justify-between p-3 bg-bg-surface border border-border border-l-2 border-l-danger rounded-md gap-4 w-full"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle size={16} className="text-danger shrink-0" />
            <span className="font-sans text-body text-text-1">
              {t('error.watcher_already_running')}
            </span>
          </div>
          <Button variant="secondary" onClick={retry}>
            {t('action.retry')}
          </Button>
        </div>
      )}

      {/* 2. Watching & Folder Status (DESIGN.md 7.1) */}
      <section className="flex flex-col gap-3 p-4 bg-bg-surface border border-border rounded-md w-full">
        <div className="flex items-center gap-3">
          <StatusDot state={statusState} />
          <span className="font-sans text-body font-medium text-text-1">{getStatusText()}</span>
        </div>

        {folders.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {folders.map(folder => (
              <Path
                key={folder}
                path={folder}
                onReveal={p => api.system.revealPath(p)}
              />
            ))}
          </div>
        ) : (
          <span className="font-sans text-small text-text-3">
            {t('empty.no_folders_desc')}
          </span>
        )}
      </section>

      {/* 3. Needs Attention Section (Only rendered if there are items) */}
      {needsAttention.length > 0 && (
        <section className="flex flex-col gap-2 p-4 bg-bg-surface border border-border border-l-2 border-l-warning rounded-md w-full">
          <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
            <h2 className="font-sans text-caption font-medium uppercase tracking-wider text-text-2">
              {t('overview.needs_attention')}
            </h2>
            <span className="font-mono text-caption text-text-3">{needsAttention.length}</span>
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            {needsAttention.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between py-1.5 px-2 bg-bg-raised rounded-sm gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Badge state={item.type === 'failed' ? 'failed' : 'skipped'}>
                    {item.type === 'failed' ? t('badge.failed') : t('badge.skipped')}
                  </Badge>
                  <span className="font-mono text-mono text-text-1 truncate" title={item.filename}>
                    {item.filename}
                  </span>
                  <span className="font-sans text-small text-text-2 truncate">
                    ({item.reason})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => dismissAttention(item.id)}
                  aria-label={t('action.close')}
                  className="text-text-3 hover:text-text-1 p-1 rounded-sm cursor-pointer border-none bg-transparent"
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Recent Activity (DESIGN.md 7.1) */}
      <section className="flex flex-col gap-3 p-4 bg-bg-surface border border-border rounded-md w-full">
        <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
          <h2 className="font-sans text-caption font-medium uppercase tracking-wider text-text-2">
            {t('overview.recent_activity')}
          </h2>
          {onNavigate && recentActivity.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('activity')}
              className="font-sans text-small text-accent hover:underline flex items-center gap-1 cursor-pointer border-none bg-transparent p-0"
            >
              <span>{t('overview.view_all')}</span>
              <ArrowRight size={12} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {recentActivity.length === 0 ? (
          <EmptyState
            icon={<Folder size={16} strokeWidth={1.5} />}
            title={t('empty.no_activity_title')}
            description={t('empty.no_activity_desc')}
            action={
              <Button variant="primary" onClick={onOrganizeNow}>
                {t('action.organize_now')}
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col w-full">
            <ListRow isHeader>
              <span className="w-60 shrink-0">File</span>
              <span className="flex-1 pl-6">Destination</span>
              <span>Rule & Time</span>
            </ListRow>

            {recentActivity.map(item => (
              <div
                key={item.id}
                className={`transition-all duration-base ease ${
                  item.isNew ? 'translate-y-1 opacity-0 animate-in fade-in slide-in-from-top-1' : ''
                }`}
              >
                <FileRow
                  filename={item.filename}
                  destPath={item.destPath}
                  ruleName={item.ruleName}
                  ruleCategoryIndex={item.ruleCategoryIndex}
                  timeAgo={
                    <Tooltip content={formatAbsoluteTime(item.timestamp)}>
                      <span className="cursor-help">{formatRelativeTime(item.timestamp)}</span>
                    </Tooltip>
                  }
                  onReveal={p => api.system.revealPath(p)}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
