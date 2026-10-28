import React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { IconButton } from '../IconButton';
import { cn } from '../../lib/utils';
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
          className={cn(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card text-card-foreground border border-border rounded-xl shadow-elevation z-50 flex flex-col outline-none overflow-hidden max-w-full',
            width === 'wide' ? 'w-dialog-wide' : 'w-dialog'
          )}
        >
          <div className="flex items-start justify-between p-5 pb-3 gap-3 border-b border-border-subtle">
            <div className="flex flex-col gap-1">
              <RadixDialog.Title className="font-sans text-subtitle font-semibold tracking-tight text-foreground">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="font-sans text-small text-muted-foreground">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild>
              <IconButton icon={<X size={14} strokeWidth={1.5} />} label={t('action.close')} />
            </RadixDialog.Close>
          </div>

          <div className="p-5 overflow-y-auto font-sans text-body text-foreground">{children}</div>

          {footer && (
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border-subtle bg-muted">
              {footer}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
