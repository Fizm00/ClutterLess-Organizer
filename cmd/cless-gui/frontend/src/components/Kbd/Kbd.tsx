import React from 'react';
import { cn } from '../../lib/utils';

export interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export const Kbd: React.FC<KbdProps> = ({ children, className }) => {
  return (
    <kbd
      className={cn(
        'pointer-events-none inline-flex h-5 items-center justify-center gap-1 rounded-sm border border-border bg-muted px-1.5 font-mono text-caption font-medium text-muted-foreground shadow-xs select-none',
        className
      )}
    >
      {children}
    </kbd>
  );
};
