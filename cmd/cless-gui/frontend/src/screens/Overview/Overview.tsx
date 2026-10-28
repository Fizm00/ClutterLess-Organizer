// SPDX-License-Identifier: AGPL-3.0-only
import React, { useEffect } from 'react';
import {
  StatusDot,
  Path,
  formatMiddleEllipsis,
  EmptyState,
} from '@/components';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Folder, ArrowRight, AlertCircle, X } from 'lucide-react';
import { useWatchStore } from '@/state/watchStore';
import { useActivityStore } from '@/state/activityStore';
import { useFoldersStore } from '@/state/foldersStore';
import { formatRelativeTime, formatAbsoluteTime } from '@/utils/time';
import { useTick } from '@/utils/useTick';
import { t } from '@/i18n';
import { api } from '@/api';

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

  const { fileCounts, fetchFolders } = useFoldersStore();

  useTick(30000);

  useEffect(() => {
    void fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    const newItems = recentActivity.filter(item => item.isNew);
    if (newItems.length > 0) {
      const timer = setTimeout(() => {
        newItems.forEach(item => clearNewFlag(item.id));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [recentActivity, clearNewFlag]);

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
      {/* 1. Error Alerts (DESIGN.md section 7.10) */}
      {configError && (
        <Alert variant="destructive" className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <AlertTitle>
                {configError.line
                  ? t('error.config_invalid_line', {
                      path: configError.path,
                      line: configError.line,
                      message: configError.message,
                    })
                  : t('error.config_invalid', { path: configError.path })}
              </AlertTitle>
              <AlertDescription>{configError.message}</AlertDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={openConfigFile}>
              {t('action.open_config')}
            </Button>
            <Button variant="outline" size="sm" onClick={retry}>
              {t('action.retry')}
            </Button>
          </div>
        </Alert>
      )}

      {watcherLocked && !configError && (
        <Alert variant="destructive" className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-4 text-destructive shrink-0" />
            <AlertTitle>{t('error.watcher_already_running')}</AlertTitle>
          </div>
          <Button variant="outline" size="sm" onClick={retry}>
            {t('action.retry')}
          </Button>
        </Alert>
      )}

      {/* 2. Status Line & Simple Flat Watched Folders List */}
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center gap-2">
          <StatusDot state={statusState} />
          <span className="text-sm font-medium text-foreground">{getStatusText()}</span>
        </div>

        {folders.length > 0 && (
          <div className="flex flex-col divide-y border-y">
            {folders.map(folder => {
              const count = fileCounts[folder];
              return (
                <div
                  key={folder}
                  className="group py-1.5 flex items-center justify-between text-sm"
                >
                  <Path path={folder} onReveal={p => api.system.revealPath(p)} />
                  {typeof count === 'number' && (
                    <span className="text-xs text-muted-foreground font-mono tabular-nums">
                      {t('folders.files_count', { count: count.toString() })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Needs Attention Alert (only rendered when items exist) */}
      {needsAttention.length > 0 && (
        <Alert>
          <AlertCircle className="size-4 text-muted-foreground" />
          <AlertTitle>{t('overview.needs_attention')}</AlertTitle>
          <AlertDescription className="w-full pt-1">
            <div className="flex flex-col gap-1 w-full">
              {needsAttention.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-0.5 w-full"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusDot state={item.type === 'failed' ? 'error' : 'warning'} />
                    <span className="text-xs font-medium text-foreground">
                      {item.type === 'failed' ? t('badge.failed') : t('badge.skipped')}
                    </span>
                    <span className="font-mono text-xs text-foreground truncate" title={item.filename}>
                      {item.filename}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      ({item.reason})
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => dismissAttention(item.id)}
                    aria-label={t('action.close')}
                  >
                    <X className="size-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 4. Recent Activity Table in a Single Bordered Container */}
      <section className="flex flex-col gap-2.5 w-full">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">{t('overview.recent_activity')}</h2>
          {onNavigate && recentActivity.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => onNavigate('activity')}
              className="text-muted-foreground hover:text-foreground"
            >
              <span>{t('overview.view_all')}</span>
              <ArrowRight className="size-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>

        <div className="rounded-lg border w-full overflow-hidden">
          {recentActivity.length === 0 ? (
            <div className="px-4">
              <EmptyState
                icon={<Folder className="size-4 text-muted-foreground" />}
                title={t('empty.no_activity_title')}
                description={t('empty.no_activity_desc')}
                action={
                  <Button variant="default" size="sm" onClick={onOrganizeNow}>
                    {t('action.organize_now')}
                  </Button>
                }
              />
            </div>
          ) : (
            <TooltipProvider delayDuration={300}>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-48 pl-4 text-xs text-muted-foreground">File</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Destination</TableHead>
                    <TableHead className="w-20 text-xs text-muted-foreground">Rule</TableHead>
                    <TableHead className="w-14 pr-4 text-right text-xs text-muted-foreground">
                      Time
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map(item => (
                    <TableRow
                      key={item.id}
                      className={`group h-9 ${
                        item.isNew ? 'animate-in fade-in slide-in-from-top-1' : ''
                      }`}
                    >
                      <TableCell className="pl-4 font-mono text-xs text-foreground">
                        <span title={item.filename}>
                          {formatMiddleEllipsis(item.filename, 24)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Path
                          path={item.destPath}
                          maxChars={28}
                          onReveal={p => api.system.revealPath(p)}
                        />
                      </TableCell>
                      <TableCell>
                        {item.ruleName ? (
                          <span className="text-xs text-muted-foreground">
                            {item.ruleName}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 text-right font-mono text-xs tabular-nums text-muted-foreground">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">
                              {formatRelativeTime(item.timestamp)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{formatAbsoluteTime(item.timestamp)}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TooltipProvider>
          )}
        </div>
      </section>
    </div>
  );
};
