import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ mono = false, error, label, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const baseInput =
      'h-7 px-2 bg-bg-surface border border-border rounded-md text-text-1 font-sans text-body transition-colors duration-fast ease w-full focus:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-3';

    const inputClasses = [
      baseInput,
      mono ? 'font-mono text-mono' : '',
      error ? 'border-danger!' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="font-sans text-small text-text-2">
            {label}
          </label>
        )}
        <input ref={ref} id={inputId} className={inputClasses} {...props} />
        {error && <span className="font-sans text-small text-danger">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
