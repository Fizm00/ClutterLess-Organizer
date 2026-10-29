// SPDX-License-Identifier: AGPL-3.0-only
import React, { useState, useEffect, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FileRow, EmptyState } from '@/components';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, FolderCheck } from 'lucide-react';
import { api } from '@/api';
import { PlanDTO, RunResultDTO } from '@/api/types';
import { useActivityStore } from '@/state/activityStore';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

export interface PreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUndoRequest?: (batchId: string) => void;
}

export const PreviewSheet: React.FC<PreviewSheetProps> = ({
  open,
  onOpenChange,
  onUndoRequest,
}) => {
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [progressText, setProgressText] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanDTO | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [unmatchedExpanded, setUnmatchedExpanded] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      setPlan(null);
      setRunning(false);
      setProgressText(null);
      setUnmatchedExpanded(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    api.organize
      .preview()
      .then(p => {
        if (!isMounted) return;
        setPlan(p);
        const initialSelected: Record<string, boolean> = {};
        let moveItemsCount = 0;
        let unmatchedCount = 0;
        p.items.forEach(item => {
          if (!item.skipped) {
            initialSelected[item.id] = true;
            moveItemsCount++;
          } else if (item.reason === 'unmatched') {
            unmatchedCount++;
          }
        });
        if (moveItemsCount === 0 && unmatchedCount > 0) {
          setUnmatchedExpanded(true);
        }
        setSelectedIds(initialSelected);
        setLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Failed to generate preview:', err);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open]);

  const willMoveItems = plan?.items.filter(item => !item.skipped) || [];
  const skippedItems = plan?.items.filter(item => item.skipped && item.reason !== 'unmatched') || [];
  const unmatchedItems = plan?.items.filter(item => item.skipped && item.reason === 'unmatched') || [];

  const selectedCount = willMoveItems.filter(item => selectedIds[item.id]).length;

  const handleToggleItem = (id: string) => {
    setSelectedIds(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleToggleAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {};
    willMoveItems.forEach(item => {
      updated[item.id] = checked;
    });
    setSelectedIds(updated);
  };

  const handleCancelRun = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setRunning(false);
    setProgressText(t('preview.cancelled'));
  };

  const handleExecuteRun = async () => {
    if (!plan || selectedCount === 0 || running) return;

    setRunning(true);
    setProgressText(t('preview.running_progress', { done: 0, total: selectedCount }));

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const unsubscribeProgress = api.onEvent('run:progress', (data: any) => {
      if (data && typeof data.done === 'number' && typeof data.total === 'number') {
        setProgressText(t('preview.running_progress', { done: data.done, total: data.total }));
      }
    });

    try {
      const activeSelectedIds = willMoveItems
        .filter(item => selectedIds[item.id])
        .map(item => item.id);

      const result: RunResultDTO = await api.organize.run({
        planId: plan.planId,
        selectedIds: activeSelectedIds,
      });

      unsubscribeProgress();
      setRunning(false);
      onOpenChange(false);

      void useActivityStore.getState().init();

      toast(t('toast.files_moved', { count: result.moved }), {
        action: {
          label: t('action.undo'),
          onClick: () => {
            if (onUndoRequest && result.batchId) {
              onUndoRequest(result.batchId);
            }
          },
        },
      });
    } catch (err: any) {
      unsubscribeProgress();
      setRunning(false);
      console.error('Failed to run organization:', err);
      toast.error(err?.message || 'Organization run failed');
    }
  };

  const countsSubtitle = plan
    ? t('dialog.preview_counts', {
        moveCount: willMoveItems.length,
        skipCount: skippedItems.length,
        unmatchedCount: unmatchedItems.length,
      })
    : '';

  const allSelected = willMoveItems.length > 0 && willMoveItems.every(item => selectedIds[item.id]);

  return (
    <Sheet
      open={open}
      onOpenChange={isOpen => {
        if (!running) onOpenChange(isOpen);
      }}
    >
      <SheetContent side="right" className="sm:max-w-xl w-full flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{t('dialog.preview_title')}</SheetTitle>
          {countsSubtitle && <SheetDescription>{countsSubtitle}</SheetDescription>}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {loading ? (
            <div className="py-12 text-sm text-muted-foreground">Calculating preview...</div>
          ) : !plan || plan.items.length === 0 ? (
            <EmptyState
              icon={<FolderCheck className="size-4 text-muted-foreground" />}
              title={t('preview.empty_title')}
              description={t('preview.empty_desc')}
            />
          ) : (
            <>
              {running && progressText && (
                <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm font-medium text-foreground">
                  {progressText}
                </div>
              )}

              {/* 1. Will Move Group */}
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={val => handleToggleAll(Boolean(val))}
                      id="select-all-preview"
                      aria-label="Select all files"
                      disabled={running || willMoveItems.length === 0}
                    />
                    <h3 className="text-sm font-medium text-foreground">
                      {t('preview.section.will_move', { count: willMoveItems.length })}
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {selectedCount} selected
                  </span>
                </div>

                {willMoveItems.length === 0 ? (
                  <div className="rounded-lg border px-4 py-6 text-center text-xs text-muted-foreground">
                    {t('preview.empty_desc')}
                  </div>
                ) : (
                  <div className="flex flex-col rounded-lg border overflow-hidden w-full divide-y">
                    {willMoveItems.map(item => {
                      const isChecked = !!selectedIds[item.id];
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'flex items-center h-10 pl-3 gap-2 transition-colors',
                            isChecked ? 'hover:bg-muted/50' : 'opacity-50'
                          )}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleItem(item.id)}
                            disabled={running}
                            aria-label={`Select ${item.source}`}
                          />
                          <div className="flex-1 min-w-0">
                            <FileRow
                              filename={item.source.split(/[/\\]/).pop() || item.source}
                              destPath={item.dest}
                              ruleName={item.ruleName}
                              onReveal={p => api.system.revealPath(p)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Skipped Group */}
              {skippedItems.length > 0 && (
                <div className="flex flex-col gap-2 w-full">
                  <h3 className="text-sm font-medium text-muted-foreground px-1">
                    {t('preview.section.skipped', { count: skippedItems.length })}
                  </h3>

                  <div className="flex flex-col rounded-lg border overflow-hidden w-full divide-y">
                    {skippedItems.map(item => (
                      <FileRow
                        key={item.id}
                        filename={item.source.split(/[/\\]/).pop() || item.source}
                        destPath={item.reason ? `(${item.reason})` : item.dest}
                        ruleName={item.ruleName}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Unmatched Group (Collapsed by default, auto-expanded if 0 will move) */}
              {unmatchedItems.length > 0 && (
                <div className="flex flex-col gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => setUnmatchedExpanded(!unmatchedExpanded)}
                    className="flex items-center gap-1.5 px-1 py-1 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer bg-transparent text-left"
                  >
                    {unmatchedExpanded ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                    <span>{t('preview.section.unmatched', { count: unmatchedItems.length })}</span>
                  </button>

                  {unmatchedExpanded && (
                    <div className="flex flex-col rounded-lg border overflow-hidden w-full divide-y">
                      {unmatchedItems.map(item => (
                        <FileRow
                          key={item.id}
                          filename={item.source.split(/[/\\]/).pop() || item.source}
                          destPath="(no matching rule)"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <SheetFooter className="px-6 py-4 border-t flex flex-row items-center justify-between sm:justify-between">
          <span className="text-xs text-muted-foreground select-none">
            {t('dialog.preview_notice')}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={running}
              onClick={() => onOpenChange(false)}
            >
              {t('action.cancel')}
            </Button>
            {running ? (
              <Button variant="outline" onClick={handleCancelRun}>
                {t('action.cancel')}
              </Button>
            ) : (
              <Button
                variant="default"
                disabled={selectedCount === 0 || loading}
                onClick={() => void handleExecuteRun()}
              >
                {selectedCount === 1
                  ? t('action.move_file')
                  : t('action.move_files', { count: selectedCount })}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
