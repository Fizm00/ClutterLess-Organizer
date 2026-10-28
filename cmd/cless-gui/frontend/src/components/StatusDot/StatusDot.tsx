import React from 'react';

export type WatcherState = 'watching' | 'paused' | 'error';

export interface StatusDotProps {
  state: WatcherState;
  label?: string;
  className?: string;
}

const stateStyles: Record<WatcherState, string> = {
  watching: 'bg-success motion-safe:animate-pulse',
  paused: 'bg-text-3',
  error: 'bg-danger',
};

export const StatusDot: React.FC<StatusDotProps> = ({ state, label, className = '' }) => {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${stateStyles[state]}`} aria-hidden="true" />
      {label && <span className="font-sans text-small text-text-2">{label}</span>}
    </div>
  );
};
