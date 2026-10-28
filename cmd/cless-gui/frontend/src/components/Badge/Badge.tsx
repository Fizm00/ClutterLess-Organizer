import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export type BadgeState = 'moved' | 'skipped' | 'failed' | 'undone' | 'applied';

export interface BadgeProps {
  children: React.ReactNode;
  state?: BadgeState;
  className?: string;
}

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 h-5 px-2 rounded-md border bg-bg-raised font-sans text-caption font-medium whitespace-nowrap select-none shadow-xs',
  {
    variants: {
      state: {
        moved: 'text-foreground border-border',
        applied: 'text-foreground border-border',
        skipped: 'text-warning border-warning',
        failed: 'text-danger border-danger',
        undone: 'text-muted-foreground border-border-subtle',
      },
    },
  }
);

const dotColors: Record<BadgeState, string> = {
  moved: 'bg-success',
  applied: 'bg-success',
  skipped: 'bg-warning',
  failed: 'bg-danger',
  undone: 'bg-text-3',
};

export const Badge: React.FC<BadgeProps> = ({ children, state, className }) => {
  return (
    <span
      className={cn(
        badgeVariants({ state }),
        !state && 'border-border text-muted-foreground',
        className
      )}
    >
      {state && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[state])} />}
      <span>{children}</span>
    </span>
  );
};
