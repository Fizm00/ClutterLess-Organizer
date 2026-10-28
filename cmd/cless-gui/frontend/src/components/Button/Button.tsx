import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-md font-sans text-body font-medium cursor-pointer border select-none whitespace-nowrap transition-colors duration-fast ease disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground font-semibold border-primary/80 shadow-sm hover:opacity-90',
        secondary:
          'bg-bg-raised/80 text-foreground border-border shadow-xs hover:bg-bg-raised hover:border-border-strong',
        ghost:
          'bg-transparent text-muted-foreground border-transparent hover:bg-bg-raised hover:text-foreground',
        danger:
          'bg-danger/10 text-danger border-danger/30 shadow-xs hover:bg-danger/20 hover:border-danger/60',
      },
      size: {
        default: 'h-8 px-3',
        sm: 'h-7 px-2.5 text-small',
        icon: 'h-8 w-8 p-0',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'default', fullWidth = false, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
