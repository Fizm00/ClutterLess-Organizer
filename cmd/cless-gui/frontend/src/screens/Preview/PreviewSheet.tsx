// SPDX-License-Identifier: AGPL-3.0-only
import React, { useState, useEffect, useRef } from 'react';
import { Sheet } from '../../components/Sheet';
import { Button } from '../../components/Button';
import { Checkbox } from '../../components/Checkbox';
import { FileRow } from '../../components/FileRow';
import { EmptyState } from '../../components/EmptyState';
import { toast } from '../../components/Toast';
import { ChevronDown, ChevronRight, FolderCheck } from 'lucide-react';
import { api } from '../../api';
import { PlanDTO, RunResultDTO } from '../../api/types';
import { useActivityStore } from '../../state/activityStore';
import { cn } from '../../lib/utils';
import { t } from '../../i18n';

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

  // Fetch preview when sheet opens
  useEffect(() => {
    if (!open) {
      setPlan(null);
      setRunning(false);
      setProgressText(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    api.organize
      .preview()
      .then(p => {
        if (!isMounted) return;
        setPlan(p);
        // Default: all move items checked
        const initialSelected: Record<string, boolean> = {};
        p.items.forEach(item => {
          if (!item.skipped) {
            initialSelected[item.id] = true;
          }
        });
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

    // Listen to live run progress
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

      // Refresh activity store
      useActivityStore.getState().init();

      // Trigger toast with Undo affordance (DESIGN.md 7.3)
      toast.show(
        t('toast.files_moved', { count: result.moved }),
        t('action.undo'),
        () => {
          if (onUndoRequest && result.batchId) {
            onUndoRequest(result.batchId);
          }
        }
      );
    } catch (err: any) {
      unsubscribeProgress();
      setRunning(false);
      console.error('Failed to run organization:', err);
      toast.show(err?.message || 'Organization run failed');
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
      title={t('dialog.preview_title')}
      description={countsSubtitle}
      footer={
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center justify-between w-full">
            <span className="font-sans text-caption text-muted-foreground select-none">
              {t('dialog.preview_notice')}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                disabled={running}
                onClick={() => onOpenChange(false)}
              >
                {t('action.cancel')}
              </Button>
              {running ? (
                <Button variant="danger" onClick={handleCancelRun}>
                  {t('action.cancel')}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  disabled={selectedCount === 0 || loading}
                  onClick={handleExecuteRun}
                >
                  {selectedCount === 1
                    ? t('action.move_file')
                    : t('action.move_files', { count: selectedCount })}
                </Button>
              )}
            </div>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5 w-full">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <span className="font-sans text-body">Calculating preview...</span>
          </div>
        ) : !plan || plan.items.length === 0 ? (
          <EmptyState
            icon={<FolderCheck size={18} strokeWidth={1.5} />}
            title={t('preview.empty_title')}
            description={t('preview.empty_desc')}
          />
        ) : (
          <>
            {/* Running Status Banner */}
            {running && progressText && (
              <div className="flex items-center justify-between p-3.5 bg-muted border border-border rounded-lg shadow-xs">
                <span className="font-sans text-body font-medium text-foreground">{progressText}</span>
              </div>
            )}

            {/* 1. Will Move Group */}
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleToggleAll}
                    id="select-all-preview"
                    aria-label="Select all files"
                    disabled={running}
                  />
                  <h3 className="font-sans text-caption font-semibold uppercase tracking-wider text-foreground">
                    {t('preview.section.will_move', { count: willMoveItems.length })}
                  </h3>
                </div>
                <span className="font-mono text-caption text-muted-foreground">
                  {selectedCount} selected
                </span>
              </div>

              <div className="flex flex-col bg-card border border-border rounded-xl shadow-xs overflow-hidden w-full divide-y divide-border-subtle">
                {willMoveItems.map(item => {
                  const isChecked = !!selectedIds[item.id];
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center h-10 px-3.5 gap-3 transition-colors duration-fast ease',
                        isChecked ? 'bg-card hover:bg-muted' : 'bg-muted opacity-60'
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
            </div>

            {/* 2. Skipped Group */}
            {skippedItems.length > 0 && (
              <div className="flex flex-col gap-2 w-full pt-1">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-sans text-caption font-semibold uppercase tracking-wider text-warning">
                    {t('preview.section.skipped', { count: skippedItems.length })}
                  </h3>
                  <span className="font-mono text-caption text-muted-foreground">
                    {skippedItems.length}
                  </span>
                </div>

                <div className="flex flex-col bg-card border border-border border-l-4 border-l-warning rounded-xl shadow-xs overflow-hidden w-full divide-y divide-border-subtle">
                  {skippedItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between h-10 px-3.5 gap-3"
                    >
                      <FileRow
                        filename={item.source.split(/[/\\]/).pop() || item.source}
                        destPath={item.reason ? `(${item.reason})` : item.dest}
                        ruleName={item.ruleName}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Unmatched Group (Collapsed by default per DESIGN.md 7.3) */}
            {unmatchedItems.length > 0 && (
              <div className="flex flex-col gap-2 w-full pt-1">
                <button
                  type="button"
                  onClick={() => setUnmatchedExpanded(!unmatchedExpanded)}
                  className="flex items-center justify-between px-1 py-1 text-muted-foreground hover:text-foreground cursor-pointer border-none bg-transparent"
                >
                  <div className="flex items-center gap-1.5 font-sans text-caption font-semibold uppercase tracking-wider">
                    {unmatchedExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>{t('preview.section.unmatched', { count: unmatchedItems.length })}</span>
                  </div>
                  <span className="font-mono text-caption">{unmatchedItems.length}</span>
                </button>

                {unmatchedExpanded && (
                  <div className="flex flex-col bg-card border border-border rounded-xl shadow-xs overflow-hidden w-full divide-y divide-border-subtle">
                    {unmatchedItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between h-10 px-3.5 gap-3 text-muted-foreground"
                      >
                        <FileRow
                          filename={item.source.split(/[/\\]/).pop() || item.source}
                          destPath="(no matching rule)"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
};
