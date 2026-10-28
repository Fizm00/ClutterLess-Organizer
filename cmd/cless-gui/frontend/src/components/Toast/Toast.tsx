import React from 'react';
import { X } from 'lucide-react';
import { useToastStore } from './toastStore';
import { Button } from '../Button';
import { t } from '../../i18n';

export const Toaster: React.FC = () => {
  const { toasts, dismissToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 max-w-sm pointer-events-none" aria-live="polite">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 py-2 px-3 bg-bg-surface border border-border rounded-md shadow-elevation"
          role="status"
        >
          <span className="font-sans text-body text-text-1 flex-1">{toast.message}</span>
          {toast.actionLabel && toast.onAction && (
            <Button
              variant="secondary"
              onClick={() => {
                toast.onAction?.();
                dismissToast(toast.id);
              }}
            >
              {toast.actionLabel}
            </Button>
          )}
          <button
            type="button"
            className="inline-flex items-center justify-center w-5 h-5 rounded-sm border-none bg-transparent text-text-3 cursor-pointer p-0 transition-colors duration-fast ease hover:text-text-1 hover:bg-bg-raised"
            onClick={() => dismissToast(toast.id)}
            aria-label={t('action.close')}
          >
            <X size={12} strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  );
};
