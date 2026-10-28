import React from 'react';
import { ChevronDown } from 'lucide-react';

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
  ({ options, label, error, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const baseSelect =
      'h-7 w-full pl-2 pr-6 bg-bg-surface border border-border rounded-md text-text-1 font-sans text-body appearance-none cursor-pointer transition-colors duration-fast ease focus:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed';

    const selectClasses = [baseSelect, error ? 'border-danger!' : '', className]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={selectId} className="font-sans text-small text-text-2">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          <select ref={ref} id={selectId} className={selectClasses} {...props}>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-2 text-text-2 pointer-events-none"
            size={14}
            strokeWidth={1.5}
          />
        </div>
        {error && <span className="font-sans text-small text-danger">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
