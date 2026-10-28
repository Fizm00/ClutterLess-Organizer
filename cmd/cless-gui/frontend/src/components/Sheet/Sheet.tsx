import React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { IconButton } from '../IconButton';
import { t } from '../../i18n';

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}) => {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-scrim z-50" />
        <RadixDialog.Content className="fixed top-0 right-0 bottom-0 w-sheet max-w-full h-screen bg-card text-card-foreground border-l border-border shadow-elevation z-50 flex flex-col outline-none">
          <div className="flex items-start justify-between p-5 border-b border-border-subtle gap-3 shrink-0">
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

          <div className="p-5 overflow-y-auto flex-1 font-sans text-body text-foreground">{children}</div>

          {footer && (
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border-subtle bg-muted shrink-0">
              {footer}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};
