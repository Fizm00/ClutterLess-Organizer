import React from 'react';
import { cn } from '@/lib/utils';

export type WatcherState = 'watching' | 'paused' | 'error' | 'warning';

export interface StatusDotProps {
  state: WatcherState;
  label?: string;
  className?: string;
}

const stateStyles: Record<WatcherState, string> = {
  watching: 'bg-status-watching motion-safe:animate-pulse',
  warning: 'bg-status-warning',
  paused: 'bg-muted-foreground',
  error: 'bg-destructive',
};

export const StatusDot: React.FC<StatusDotProps> = ({ state, label, className }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('inline-flex items-center gap-2 select-none', className)}
    >
      <span className={cn('size-2 rounded-full shrink-0', stateStyles[state])} aria-hidden="true" />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
};
