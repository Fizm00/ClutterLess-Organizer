import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', fullWidth = false, className = '', children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center h-7 px-3 rounded-md font-sans text-body font-semibold cursor-pointer border select-none whitespace-nowrap transition-colors duration-fast ease disabled:opacity-50 disabled:cursor-not-allowed';

    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-accent text-on-accent border-transparent hover:opacity-90',
      secondary: 'bg-bg-surface text-text-1 border-border hover:bg-bg-raised hover:border-border-strong',
      ghost: 'bg-transparent text-text-2 border-transparent hover:bg-bg-raised hover:text-text-1 hover:border-border',
      danger: 'bg-bg-surface text-danger border-border hover:bg-bg-raised hover:border-danger',
    };

    const classNames = [base, variants[variant], fullWidth ? 'w-full' : '', className]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} className={classNames} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
