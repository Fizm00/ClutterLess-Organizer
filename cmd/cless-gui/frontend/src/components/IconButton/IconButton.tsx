import React from 'react';
import { Tooltip } from '../Tooltip';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string; // Required for a11y
  variant?: 'ghost' | 'secondary' | 'danger';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, variant = 'ghost', className = '', ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center w-7 h-7 min-w-7 min-h-7 p-0 rounded-md border border-transparent bg-transparent text-text-2 cursor-pointer transition-colors duration-fast ease hover:bg-bg-raised hover:text-text-1 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      ghost: '',
      secondary: 'bg-bg-surface border-border text-text-1 hover:border-border-strong',
      danger: 'text-danger hover:border-danger',
    };

    const classNames = [base, variants[variant], className].filter(Boolean).join(' ');

    return (
      <Tooltip content={label}>
        <button ref={ref} className={classNames} aria-label={label} {...props}>
          {icon}
        </button>
      </Tooltip>
    );
  }
);

IconButton.displayName = 'IconButton';
