import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ mono = false, error, label, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="font-sans text-small font-medium text-foreground select-none"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'flex h-8 w-full rounded-md border border-input bg-bg-surface px-3 py-1 font-sans text-body text-foreground shadow-xs transition-colors duration-fast ease placeholder:text-text-3 hover:border-border-strong focus:border-accent disabled:cursor-not-allowed disabled:opacity-50',
            mono && 'font-mono text-mono',
            error && 'border-danger focus:border-danger',
            className
          )}
          {...props}
        />
        {error && <span className="font-sans text-small font-medium text-danger">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
