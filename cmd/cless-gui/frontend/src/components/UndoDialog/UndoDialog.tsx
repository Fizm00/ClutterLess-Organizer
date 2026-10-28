// SPDX-License-Identifier: AGPL-3.0-only
import React, { useState, useEffect } from 'react';
import { Dialog } from '../Dialog';
import { Button } from '../Button';
import { FileRow } from '../FileRow';
import { toast } from '../Toast';
import { api } from '../../api';
import { PlanDTO, UndoResultDTO } from '../../api/types';
import { useActivityStore } from '../../state/activityStore';
import { t } from '../../i18n';

export interface UndoDialogProps {
  batchId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (result: UndoResultDTO) => void;
}

export const UndoDialog: React.FC<UndoDialogProps> = ({
  batchId,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [plan, setPlan] = useState<PlanDTO | null>(null);

  useEffect(() => {
    if (!open || !batchId) {
      setPlan(null);
      setConfirming(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    api.history
      .undoPreview(batchId)
      .then(p => {
        if (!isMounted) return;
        setPlan(p);
        setLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Failed to load undo preview:', err);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, batchId]);

  const handleConfirmUndo = async () => {
    if (!batchId || confirming) return;

    setConfirming(true);
    try {
      const result = await api.history.undo(batchId);
      setConfirming(false);
      onOpenChange(false);

      // Refresh stores
      useActivityStore.getState().init();

      toast.show(
        t('toast.restored', {
          count: result.restored,
          conflicts: result.skipped + result.failed,
        })
      );

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: any) {
      setConfirming(false);
      console.error('Undo operation failed:', err);
      toast.show(err?.message || 'Undo operation failed');
    }
  };

  const fileCount = plan?.items ? plan.items.length : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!confirming) onOpenChange(isOpen);
      }}
      title={batchId ? t('dialog.undo_title', { id: batchId }) : t('dialog.confirm_title')}
      description={t('dialog.undo_desc')}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={confirming}
            onClick={() => onOpenChange(false)}
          >
            {t('action.cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={loading || confirming || fileCount === 0}
            onClick={handleConfirmUndo}
          >
            {fileCount === 1
              ? t('action.restore_file')
              : t('action.restore_files', { count: fileCount })}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 w-full">
        {loading ? (
          <div className="py-8 flex items-center justify-center text-muted-foreground font-sans text-body">
            Preparing undo preview...
          </div>
        ) : !plan || plan.items.length === 0 ? (
          <div className="py-6 text-muted-foreground font-sans text-body text-center">
            No files to restore in this batch.
          </div>
        ) : (
          <div className="flex flex-col border border-border rounded-lg overflow-hidden max-h-72 overflow-y-auto w-full divide-y divide-border-subtle">
            {plan.items.map(item => (
              <FileRow
                key={item.id}
                filename={item.source.split(/[/\\]/).pop() || item.source}
                destPath={item.dest}
                ruleName={item.ruleName}
              />
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
};
