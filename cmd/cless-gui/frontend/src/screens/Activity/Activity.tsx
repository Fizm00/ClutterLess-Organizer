// SPDX-License-Identifier: AGPL-3.0-only
import React, { useState, useEffect, useMemo } from 'react';
import {
  SegmentedControl,
  Input,
  Button,
  Badge,
  FileRow,
  EmptyState,
  Tooltip,
} from '../../components';
import {
  Search,
  ChevronDown,
  ChevronRight,
  History,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { UndoDialog } from '../../components/UndoDialog';
import { useActivityStore } from '../../state/activityStore';
import { BatchSummaryDTO } from '../../api/types';
import { formatRelativeTime, formatAbsoluteTime } from '../../utils/time';
import { api } from '../../api';
import { cn } from '../../lib/utils';
import { t } from '../../i18n';

export type ActivityFilterType = 'all' | 'applied' | 'undone';

export interface ActivityProps {
  onOrganizeNow?: () => void;
}

export const Activity: React.FC<ActivityProps> = ({ onOrganizeNow }) => {
  const {
    batches,
    batchDetails,
    expandedBatchIds,
    loadBatches,
    toggleBatchExpanded,
    retryFile,
  } = useActivityStore();

  const [filter, setFilter] = useState<ActivityFilterType>('all');
  const [search, setSearch] = useState('');
  const [selectedUndoBatchId, setSelectedUndoBatchId] = useState<string | null>(null);
  const [retryingPath, setRetryingPath] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Handle retry of a single failed file
  const handleRetryFile = async (path: string) => {
    setRetryingPath(path);
    await retryFile(path);
    setRetryingPath(null);
  };

  // Filter batches by status
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

  // Further filter by search query (batch id, or filename/destination in cached details)
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

  // Group batches by calendar date
  const groupedBatches = useMemo(() => {
    const groups: Array<{ dateLabel: string; items: BatchSummaryDTO[] }> = [];
    const dateMap = new Map<string, BatchSummaryDTO[]>();

    filteredBatches.forEach(batch => {
      const d = new Date(batch.time);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let label = d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (d.toDateString() === today.toDateString()) {
        label = 'Today';
      } else if (d.toDateString() === yesterday.toDateString()) {
        label = 'Yesterday';
      }

      if (!dateMap.has(label)) {
        dateMap.set(label, []);
        groups.push({ dateLabel: label, items: dateMap.get(label)! });
      }
      dateMap.get(label)!.push(batch);
    });

    return groups;
  }, [filteredBatches]);

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* 1. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-card border border-border rounded-xl shadow-xs w-full">
        <SegmentedControl<ActivityFilterType>
          options={[
            { value: 'all', label: t('activity.filter.all') },
            { value: 'applied', label: t('activity.filter.applied') },
            { value: 'undone', label: t('activity.filter.undone') },
          ]}
          value={filter}
          onChange={setFilter}
          ariaLabel="Activity Status Filter"
        />

        <div className="relative flex-1 max-w-sm">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('activity.search_placeholder')}
            className="pl-8"
          />
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>
      </div>

      {/* 2. Batches List / Empty State */}
      {filteredBatches.length === 0 ? (
        <div className="flex flex-col bg-card border border-border rounded-xl shadow-xs overflow-hidden w-full p-6">
          <EmptyState
            icon={<History size={18} strokeWidth={1.5} />}
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
                <Button variant="primary" onClick={onOrganizeNow}>
                  {t('action.organize_now')}
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6 w-full">
          {groupedBatches.map(group => (
            <div key={group.dateLabel} className="flex flex-col gap-2.5 w-full">
              <span className="font-sans text-caption font-semibold uppercase tracking-wider text-muted-foreground px-1">
                {group.dateLabel}
              </span>

              <div className="flex flex-col gap-3 w-full">
                {group.items.map(batch => {
                  const isExpanded = !!expandedBatchIds[batch.id];
                  const details = batchDetails[batch.id];
                  const isUndone = batch.allUndone;
                  const isPartial = batch.undone > 0 && !batch.allUndone;

                  return (
                    <div
                      key={batch.id}
                      className={cn(
                        'flex flex-col bg-card border border-border rounded-xl shadow-xs overflow-hidden transition-all duration-fast ease',
                        isUndone && 'opacity-65'
                      )}
                    >
                      {/* Batch Header Row */}
                      <div className="flex items-center justify-between px-4 py-3 gap-3 border-b border-border-subtle hover:bg-muted/40 transition-colors duration-fast ease select-none">
                        <div
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          onClick={() => toggleBatchExpanded(batch.id)}
                        >
                          <button
                            type="button"
                            aria-label={isExpanded ? 'Collapse batch' : 'Expand batch'}
                            className="p-1 rounded-sm text-muted-foreground hover:text-foreground border-none bg-transparent cursor-pointer"
                          >
                            {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>

                          <span className="font-mono text-mono font-medium text-foreground whitespace-nowrap">
                            {batch.id}
                          </span>

                          <span className="font-sans text-small text-muted-foreground whitespace-nowrap">
                            {batch.total === 1
                              ? t('activity.batch_file')
                              : t('activity.batch_files', { count: batch.total })}
                          </span>

                          <Badge
                            state={
                              isUndone ? 'undone' : isPartial ? 'skipped' : 'applied'
                            }
                          >
                            {isUndone
                              ? t('activity.status.undone')
                              : isPartial
                              ? t('activity.status.partially_undone')
                              : t('activity.status.applied')}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <Tooltip content={formatAbsoluteTime(batch.time)}>
                            <span className="font-mono text-caption text-muted-foreground cursor-help whitespace-nowrap">
                              {formatRelativeTime(batch.time)}
                            </span>
                          </Tooltip>

                          {isUndone ? (
                            <Tooltip content={t('activity.already_undone_tooltip')}>
                              <span>
                                <Button variant="secondary" size="sm" disabled>
                                  <RotateCcw size={13} strokeWidth={1.5} />
                                  <span>{t('action.undo_batch')}</span>
                                </Button>
                              </span>
                            </Tooltip>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedUndoBatchId(batch.id)}
                            >
                              <RotateCcw size={13} strokeWidth={1.5} />
                              <span>{t('action.undo_batch')}</span>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Records List */}
                      {isExpanded && (
                        <div className="flex flex-col w-full bg-bg-surface divide-y divide-border-subtle">
                          {!details || !details.records ? (
                            <div className="py-4 text-center text-muted-foreground font-sans text-small">
                              Loading files...
                            </div>
                          ) : (
                            details.records.map((rec, idx) => {
                              const isFailed = rec.status === 'failed';
                              return (
                                <div
                                  key={`${rec.batchId}-${idx}`}
                                  className={cn(
                                    'flex items-center justify-between px-4 py-2 hover:bg-muted transition-colors duration-fast ease gap-3',
                                    isFailed && 'bg-danger/5'
                                  )}
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
                                      variant="danger"
                                      size="sm"
                                      disabled={retryingPath === rec.source}
                                      onClick={() => handleRetryFile(rec.source)}
                                    >
                                      <RefreshCw
                                        size={12}
                                        className={cn(retryingPath === rec.source && 'animate-spin')}
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
        </div>
      )}

      {/* 3. Undo Batch Dialog */}
      <UndoDialog
        batchId={selectedUndoBatchId}
        open={!!selectedUndoBatchId}
        onOpenChange={open => {
          if (!open) setSelectedUndoBatchId(null);
        }}
        onSuccess={() => {
          loadBatches();
        }}
      />
    </div>
  );
};
