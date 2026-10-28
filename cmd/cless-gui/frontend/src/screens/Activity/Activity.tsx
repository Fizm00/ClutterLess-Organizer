// SPDX-License-Identifier: AGPL-3.0-only
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FileRow, EmptyState, Kbd, StatusDot } from '@/components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search,
  ChevronDown,
  ChevronRight,
  History,
  RotateCcw,
  RefreshCw,
  MoreHorizontal,
  Copy,
} from 'lucide-react';
import { UndoDialog } from '@/components/UndoDialog';
import { useActivityStore } from '@/state/activityStore';
import { BatchSummaryDTO } from '@/api/types';
import { formatRelativeTime, formatAbsoluteTime } from '@/utils/time';
import { api } from '@/api';
import { cn } from '@/lib/utils';
import { useLocaleStore, t } from '@/i18n';

export type ActivityFilterType = 'all' | 'applied' | 'undone';

export interface ActivityProps {
  onOrganizeNow?: () => void;
}

const INITIAL_PAGE_SIZE = 50;

export const Activity: React.FC<ActivityProps> = ({ onOrganizeNow }) => {
  const {
    batches,
    batchDetails,
    expandedBatchIds,
    loadBatches,
    toggleBatchExpanded,
    retryFile,
  } = useActivityStore();
  const { locale } = useLocaleStore();

  const [filter, setFilter] = useState<ActivityFilterType>('all');
  const [search, setSearch] = useState('');
  const [displayedLimit, setDisplayedLimit] = useState(INITIAL_PAGE_SIZE);
  const [selectedUndoBatchId, setSelectedUndoBatchId] = useState<string | null>(null);
  const [retryingPath, setRetryingPath] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRetryFile = async (path: string) => {
    setRetryingPath(path);
    await retryFile(path);
    setRetryingPath(null);
  };

  const statusFilteredBatches = useMemo(() => {
    return batches.filter(batch => {
      if (filter === 'applied') {
        return !batch.allUndone;
      }
      if (filter === 'undone') {
        return batch.allUndone;
      }
      return true;
    });
  }, [batches, filter]);

  const filteredBatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return statusFilteredBatches;

    return statusFilteredBatches.filter(batch => {
      if (batch.id.toLowerCase().includes(q)) return true;
      const detail = batchDetails[batch.id];
      if (detail && detail.records) {
        return detail.records.some(
          r =>
            r.source.toLowerCase().includes(q) ||
            r.dest.toLowerCase().includes(q) ||
            (r.rule && r.rule.toLowerCase().includes(q))
        );
      }
      return false;
    });
  }, [statusFilteredBatches, search, batchDetails]);

  const paginatedBatches = useMemo(() => {
    return filteredBatches.slice(0, displayedLimit);
  }, [filteredBatches, displayedLimit]);

  const groupedBatches = useMemo(() => {
    const groups: Array<{ dateLabel: string; items: BatchSummaryDTO[] }> = [];
    const dateMap = new Map<string, BatchSummaryDTO[]>();

    paginatedBatches.forEach(batch => {
      const d = new Date(batch.time);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let label = d.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (d.toDateString() === today.toDateString()) {
        label = locale === 'id' ? 'Hari ini' : 'Today';
      } else if (d.toDateString() === yesterday.toDateString()) {
        label = locale === 'id' ? 'Kemarin' : 'Yesterday';
      }

      if (!dateMap.has(label)) {
        dateMap.set(label, []);
        groups.push({ dateLabel: label, items: dateMap.get(label)! });
      }
      dateMap.get(label)!.push(batch);
    });

    return groups;
  }, [paginatedBatches, locale]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-6 w-full">
        {/* 1. Flat Toolbar: Tabs on Left, Search Input on Right */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <Tabs
            value={filter}
            onValueChange={val => {
              setFilter(val as ActivityFilterType);
              setDisplayedLimit(INITIAL_PAGE_SIZE);
            }}
          >
            <TabsList aria-label="Activity Status Filter">
              <TabsTrigger value="all">{t('activity.filter.all')}</TabsTrigger>
              <TabsTrigger value="applied">{t('activity.filter.applied')}</TabsTrigger>
              <TabsTrigger value="undone">{t('activity.filter.undone')}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1 max-w-sm">
            <Search className="size-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setDisplayedLimit(INITIAL_PAGE_SIZE);
              }}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setSearch('');
                }
              }}
              placeholder={t('activity.search_placeholder')}
              className="pl-8 pr-16"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <Kbd>Ctrl+K</Kbd>
            </div>
          </div>
        </div>

        {/* 2. Batches List Grouped by Date in a Single Bordered Container */}
        {filteredBatches.length === 0 ? (
          <div className="rounded-lg border px-4 w-full">
            <EmptyState
              icon={<History className="size-4 text-muted-foreground" />}
              title={
                search || filter !== 'all'
                  ? t('activity.empty_filter_title')
                  : t('activity.empty_title')
              }
              description={
                search || filter !== 'all'
                  ? t('activity.empty_filter_desc')
                  : t('activity.empty_desc')
              }
              action={
                !search && filter === 'all' && onOrganizeNow ? (
                  <Button variant="default" size="sm" onClick={onOrganizeNow}>
                    {t('action.organize_now')}
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6 w-full">
            {groupedBatches.map(group => (
              <div key={group.dateLabel} className="flex flex-col gap-2 w-full">
                <h2 className="text-xs font-medium text-muted-foreground">{group.dateLabel}</h2>

                <div className="rounded-lg border divide-y w-full overflow-hidden">
                  {group.items.map(batch => {
                    const isExpanded = !!expandedBatchIds[batch.id];
                    const details = batchDetails[batch.id];
                    const isUndone = batch.allUndone;
                    const isPartial = batch.undone > 0 && !batch.allUndone;

                    return (
                      <div
                        key={batch.id}
                        className={cn('flex flex-col w-full', isUndone && 'opacity-60')}
                      >
                        {/* Batch Row */}
                        <div className="flex items-center justify-between h-10 px-3 gap-3 hover:bg-muted/50 transition-colors select-none">
                          <div
                            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                            onClick={() => toggleBatchExpanded(batch.id)}
                          >
                            <button
                              type="button"
                              aria-label={isExpanded ? 'Collapse batch' : 'Expand batch'}
                              className="p-1 rounded text-muted-foreground hover:text-foreground bg-transparent cursor-pointer"
                            >
                              {isExpanded ? (
                                <ChevronDown className="size-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="size-4 text-muted-foreground" />
                              )}
                            </button>

                            <span className="font-mono text-xs text-foreground whitespace-nowrap">
                              {batch.id}
                            </span>

                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {batch.total === 1
                                ? t('activity.batch_file')
                                : t('activity.batch_files', { count: batch.total })}
                            </span>

                            <Badge variant="outline" className="gap-1.5 font-normal">
                              <StatusDot state={isUndone ? 'paused' : isPartial ? 'warning' : 'watching'} />
                              <span>
                                {isUndone
                                  ? t('activity.status.undone')
                                  : isPartial
                                  ? t('activity.status.partially_undone')
                                  : t('activity.status.applied')}
                              </span>
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-mono text-xs tabular-nums text-muted-foreground cursor-help whitespace-nowrap">
                                  {formatRelativeTime(batch.time)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{formatAbsoluteTime(batch.time)}</TooltipContent>
                            </Tooltip>

                            {isUndone ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled
                                      aria-label={t('action.undo_batch')}
                                    >
                                      <RotateCcw className="size-3.5 text-muted-foreground" />
                                      <span>{t('action.undo_batch')}</span>
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{t('activity.already_undone_tooltip')}</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={t('action.undo_batch')}
                                onClick={() => setSelectedUndoBatchId(batch.id)}
                              >
                                <RotateCcw className="size-3.5 text-muted-foreground" />
                                <span>{t('action.undo_batch')}</span>
                              </Button>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`More actions for ${batch.id}`}
                                >
                                  <MoreHorizontal className="size-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => void navigator.clipboard.writeText(batch.id)}
                                >
                                  <Copy className="size-4 text-muted-foreground" />
                                  <span>Copy batch ID</span>
                                </DropdownMenuItem>
                                {!isUndone && (
                                  <DropdownMenuItem
                                    onClick={() => setSelectedUndoBatchId(batch.id)}
                                  >
                                    <RotateCcw className="size-4 text-muted-foreground" />
                                    <span>{t('action.undo_batch')}</span>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Expanded File Rows */}
                        {isExpanded && (
                          <div className="flex flex-col w-full border-t bg-muted/20 divide-y">
                            {!details || !details.records ? (
                              <div className="py-3 px-4 text-sm text-muted-foreground">
                                Loading files...
                              </div>
                            ) : (
                              details.records.map((rec, idx) => {
                                const isFailed = rec.status === 'failed';
                                return (
                                  <div
                                    key={`${rec.batchId}-${idx}`}
                                    className="flex items-center justify-between pl-6 pr-3 gap-3"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <FileRow
                                        filename={rec.source.split(/[/\\]/).pop() || rec.source}
                                        destPath={rec.dest}
                                        ruleName={rec.rule}
                                        onReveal={p => api.system.revealPath(p)}
                                      />
                                    </div>

                                    {isFailed && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        aria-label={t('action.retry')}
                                        disabled={retryingPath === rec.source}
                                        onClick={() => void handleRetryFile(rec.source)}
                                      >
                                        <RefreshCw
                                          className={cn(
                                            'size-4 text-muted-foreground',
                                            retryingPath === rec.source && 'animate-spin'
                                          )}
                                        />
                                        <span>{t('action.retry')}</span>
                                      </Button>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredBatches.length > displayedLimit && (
              <div className="flex flex-col items-center justify-center pt-2 pb-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDisplayedLimit(prev => prev + INITIAL_PAGE_SIZE)}
                  data-testid="btn-load-more-batches"
                >
                  <span>{t('activity.load_more')}</span>
                </Button>
                <span className="text-xs text-muted-foreground">
                  {t('activity.showing_batches', {
                    shown: Math.min(displayedLimit, filteredBatches.length),
                    total: filteredBatches.length,
                  })}
                </span>
              </div>
            )}
          </div>
        )}

        <UndoDialog
          batchId={selectedUndoBatchId}
          open={!!selectedUndoBatchId}
          onOpenChange={open => {
            if (!open) setSelectedUndoBatchId(null);
          }}
          onSuccess={() => {
            void loadBatches();
          }}
        />
      </div>
    </TooltipProvider>
  );
};
