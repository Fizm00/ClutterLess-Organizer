import React from 'react';

export type BadgeState = 'moved' | 'skipped' | 'failed' | 'undone' | 'applied';

export interface BadgeProps {
  children: React.ReactNode;
  state?: BadgeState;
  className?: string;
}

const stateStyles: Record<BadgeState, { text: string; border: string; dot: string }> = {
  moved: { text: 'text-text-1', border: 'border-border', dot: 'bg-success' },
  applied: { text: 'text-text-1', border: 'border-border', dot: 'bg-success' },
  skipped: { text: 'text-warning', border: 'border-warning', dot: 'bg-warning' },
  failed: { text: 'text-danger', border: 'border-danger', dot: 'bg-danger' },
  undone: { text: 'text-text-3', border: 'border-border-subtle', dot: 'bg-text-3' },
};

export const Badge: React.FC<BadgeProps> = ({ children, state, className = '' }) => {
  const current = state ? stateStyles[state] : null;
  return (
    <span
      className={`inline-flex items-center gap-1 h-5 px-2 rounded-sm border bg-transparent font-sans text-caption font-medium whitespace-nowrap select-none ${
        current ? `${current.text} ${current.border}` : 'border-border text-text-2'
      } ${className}`}
    >
      {current && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dot}`} />}
      <span>{children}</span>
    </span>
  );
};
