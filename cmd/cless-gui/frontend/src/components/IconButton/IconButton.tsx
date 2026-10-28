import React from 'react';
import { cva } from 'class-variance-authority';
import { Tooltip } from '../Tooltip';
import { cn } from '../../lib/utils';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string; // Required for a11y
  variant?: 'ghost' | 'secondary' | 'danger';
}

const iconButtonVariants = cva(
  'inline-flex items-center justify-center w-7 h-7 min-w-7 min-h-7 p-0 rounded-md border cursor-pointer transition-colors duration-fast ease disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        ghost: 'border-transparent bg-transparent text-muted-foreground hover:bg-bg-raised hover:text-foreground',
        secondary: 'bg-bg-surface border-border text-foreground shadow-xs hover:bg-bg-raised hover:border-border-strong',
        danger: 'border-transparent bg-transparent text-danger hover:bg-bg-raised hover:border-danger',
      },
    },
    defaultVariants: {
      variant: 'ghost',
    },
  }
);

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, variant = 'ghost', className, ...props }, ref) => {
    return (
      <Tooltip content={label}>
        <button
          ref={ref}
          className={cn(iconButtonVariants({ variant }), className)}
          aria-label={label}
          {...props}
        >
          {icon}
        </button>
      </Tooltip>
    );
  }
);

IconButton.displayName = 'IconButton';
