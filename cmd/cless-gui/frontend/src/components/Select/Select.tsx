import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, label, error, className, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="font-sans text-small font-medium text-foreground select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'flex h-8 w-full appearance-none rounded-md border border-input bg-bg-surface pl-3 pr-8 font-sans text-body text-foreground shadow-xs cursor-pointer transition-colors duration-fast ease hover:border-border-strong focus:border-accent disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-danger focus:border-danger',
              className
            )}
            {...props}
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-2.5 text-muted-foreground pointer-events-none"
            size={14}
            strokeWidth={1.5}
          />
        </div>
        {error && <span className="font-sans text-small font-medium text-danger">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
