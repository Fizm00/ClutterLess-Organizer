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
import {
  Folder,
  ArrowRight,
  AlertCircle,
  X,
  Activity,
  CheckCircle2,
  Clock,
} from 'lucide-react';
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
    <div className="flex flex-col gap-5 w-full">
      {/* 1. Error Alerts (shadcn Alert style, DESIGN.md section 7.10) */}
      {configError && (
        <div
          role="alert"
          className="flex items-center justify-between p-4 bg-card border border-danger border-l-4 rounded-xl shadow-xs gap-4 w-full"
        >
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-sans text-body font-semibold text-foreground">
                {configError.line
                  ? t('error.config_invalid_line', {
                      path: configError.path,
                      line: configError.line,
                      message: configError.message,
                    })
                  : t('error.config_invalid', { path: configError.path })}
              </span>
              <span className="font-sans text-small text-muted-foreground">{configError.message}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={openConfigFile}>
              {t('action.open_config')}
            </Button>
            <Button variant="secondary" size="sm" onClick={retry}>
              {t('action.retry')}
            </Button>
          </div>
        </div>
      )}

      {watcherLocked && !configError && (
        <div
          role="alert"
          className="flex items-center justify-between p-4 bg-card border border-danger border-l-4 rounded-xl shadow-xs gap-4 w-full"
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-danger shrink-0" />
            <span className="font-sans text-body font-medium text-foreground">
              {t('error.watcher_already_running')}
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={retry}>
            {t('action.retry')}
          </Button>
        </div>
      )}

      {/* 2. Shadcn KPI Bento Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
        {/* KPI 1: Engine Status */}
        <div className="flex flex-col justify-between p-4 rounded-xl bg-card border border-border shadow-xs gap-2.5">
          <div className="flex items-center justify-between">
            <span className="font-sans text-small font-medium text-text-2">Watcher Status</span>
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 text-accent">
              <Activity size={14} strokeWidth={1.75} />
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <StatusDot state={statusState} />
              <span className="font-sans text-title font-semibold tracking-tight text-foreground">
                {statusState === 'watching' ? 'Active' : statusState === 'error' ? 'Error' : 'Paused'}
              </span>
            </div>
            <Badge
              state={
                statusState === 'watching'
                  ? 'moved'
                  : statusState === 'error'
                  ? 'failed'
                  : 'undone'
              }
            >
              {t('overview.watching_header')}
            </Badge>
          </div>
          <span className="font-sans text-caption text-text-3 truncate">
            {getStatusText()}
          </span>
        </div>

        {/* KPI 2: Monitored Directories */}
        <div className="flex flex-col justify-between p-4 rounded-xl bg-card border border-border shadow-xs gap-2.5">
          <div className="flex items-center justify-between">
            <span className="font-sans text-small font-medium text-text-2">Watched Folders</span>
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500">
              <Folder size={14} strokeWidth={1.75} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-title font-semibold tracking-tight text-foreground">
              {folders.length}
            </span>
            <span className="font-sans text-small text-text-2">directories</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-hidden">
            {folders.length > 0 ? (
              folders.slice(0, 2).map(folder => (
                <div
                  key={folder}
                  className="inline-flex items-center gap-1 bg-muted/80 border border-border-subtle rounded-md px-2 py-0.5 max-w-full"
                >
                  <Path path={folder} onReveal={p => api.system.revealPath(p)} />
                </div>
              ))
            ) : (
              <span className="font-sans text-caption text-text-3">
                {t('empty.no_folders_desc')}
              </span>
            )}
          </div>
        </div>

        {/* KPI 3: Recent Automated Moves */}
        <div className="flex flex-col justify-between p-4 rounded-xl bg-card border border-border shadow-xs gap-2.5">
          <div className="flex items-center justify-between">
            <span className="font-sans text-small font-medium text-text-2">Recent Activity</span>
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <CheckCircle2 size={14} strokeWidth={1.75} />
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-title font-semibold tracking-tight text-foreground">
                {recentActivity.length}
              </span>
              <span className="font-sans text-small text-text-2">files sorted</span>
            </div>
            {needsAttention.length > 0 && (
              <span className="inline-flex items-center gap-1 font-mono text-caption text-warning bg-warning/10 border border-warning/25 px-1.5 py-0.5 rounded-md">
                <Clock size={11} />
                {needsAttention.length} pending
              </span>
            )}
          </div>
          <span className="font-sans text-caption text-text-3 truncate">
            {lastMovedTime
              ? `Last file organized ${formatRelativeTime(lastMovedTime)}`
              : 'Waiting for incoming files'}
          </span>
        </div>
      </div>

      {/* 3. Needs Attention Card (Only rendered if there are items) */}
      {needsAttention.length > 0 && (
        <section className="flex flex-col bg-card text-card-foreground border border-border border-l-4 border-l-warning rounded-xl shadow-xs overflow-hidden w-full">
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-border-subtle bg-muted/50">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-warning" />
              <h2 className="font-sans text-caption font-semibold uppercase tracking-wider text-warning">
                {t('overview.needs_attention')}
              </h2>
            </div>
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-card border border-border font-mono text-caption text-muted-foreground shadow-xs">
              {needsAttention.length}
            </span>
          </div>
          <div className="flex flex-col w-full">
            {needsAttention.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between h-10 px-5 border-b border-border-subtle last:border-b-0 hover:bg-muted/40 transition-colors duration-fast ease gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge state={item.type === 'failed' ? 'failed' : 'skipped'}>
                    {item.type === 'failed' ? t('badge.failed') : t('badge.skipped')}
                  </Badge>
                  <span className="font-mono text-mono font-medium text-foreground truncate" title={item.filename}>
                    {item.filename}
                  </span>
                  <span className="font-sans text-small text-muted-foreground truncate">
                    ({item.reason})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => dismissAttention(item.id)}
                  aria-label={t('action.close')}
                  className="text-muted-foreground hover:text-foreground hover:bg-bg-surface p-1 rounded-md cursor-pointer border-none bg-transparent transition-colors duration-fast ease"
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Recent Activity Card & Table (shadcn Card + Data Table style) */}
      <section className="flex flex-col bg-card text-card-foreground border border-border rounded-xl shadow-xs overflow-hidden w-full">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle bg-muted/20">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-sans text-subtitle font-semibold tracking-tight text-foreground">
              {t('overview.recent_activity')}
            </h2>
            <span className="font-sans text-caption text-text-3">
              Real-time log of files organized across your monitored folders
            </span>
          </div>
          {onNavigate && recentActivity.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('activity')}
              className="font-sans text-small font-medium text-accent hover:underline inline-flex items-center gap-1 cursor-pointer border border-border-subtle bg-bg-surface px-2.5 py-1 rounded-md hover:bg-muted transition-colors duration-fast ease shadow-xs"
            >
              <span>{t('overview.view_all')}</span>
              <ArrowRight size={13} strokeWidth={1.75} />
            </button>
          )}
        </div>

        {recentActivity.length === 0 ? (
          <div className="px-6 py-6">
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
          </div>
        ) : (
          <div className="flex flex-col w-full">
            <ListRow isHeader>
              <span className="w-64 shrink-0">File</span>
              <span className="w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 min-w-0">Destination</span>
              <span className="w-28 shrink-0 text-right">Rule</span>
              <span className="w-12 shrink-0 text-right">Time</span>
            </ListRow>

            {recentActivity.map(item => (
              <div
                key={item.id}
                className={`transition-all duration-base ease border-b border-border-subtle last:border-b-0 ${
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
