import React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { IconButton } from '../IconButton';
import { t } from '../../i18n';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  width?: 'default' | 'wide'; // 480px or 640px
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  width = 'default',
  children,
  footer,
}) => {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-scrim z-50" />
        <RadixDialog.Content
          className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-surface border border-border rounded-lg shadow-elevation z-50 flex flex-col outline-none overflow-hidden ${
            width === 'wide' ? 'w-dialog-wide' : 'w-dialog'
          } max-w-full`}
        >
          <div className="flex items-start justify-between p-4 pb-2 gap-3">
            <div className="flex flex-col gap-1">
              <RadixDialog.Title className="font-sans text-subtitle font-semibold text-text-1">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="font-sans text-small text-text-2">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild>
              <IconButton icon={<X size={14} strokeWidth={1.5} />} label={t('action.close')} />
            </RadixDialog.Close>
          </div>

          <div className="p-4 overflow-y-auto font-sans text-body text-text-1">{children}</div>

          {footer && (
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-subtle bg-bg-raised">
              {footer}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
