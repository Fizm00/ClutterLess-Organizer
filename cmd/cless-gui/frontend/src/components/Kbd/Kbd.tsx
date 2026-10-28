import React from 'react';

export interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export const Kbd: React.FC<KbdProps> = ({ children, className = '' }) => {
  return (
    <kbd
      className={`inline-flex items-center justify-center py-0.5 px-1 rounded-sm border border-border bg-bg-raised text-text-2 font-mono text-caption font-regular select-none ${className}`}
    >
      {children}
    </kbd>
  );
};
