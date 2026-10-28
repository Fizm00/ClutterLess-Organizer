import React from 'react';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div className={`inline-flex items-center bg-bg-raised rounded-md p-0.5 gap-0.5 border border-border-subtle select-none ${className}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map(opt => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            className={`inline-flex items-center justify-center h-6 px-2 rounded-sm border font-sans text-small whitespace-nowrap cursor-pointer transition-colors duration-fast ease ${
              isSelected
                ? 'bg-bg-surface text-text-1 font-semibold border-border'
                : 'border-transparent bg-transparent text-text-2 font-regular hover:text-text-1'
            }`}
            onClick={() => onChange(opt.value)}
            onKeyDown={e => {
              const idx = options.findIndex(o => o.value === value);
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                const next = (idx + 1) % options.length;
                onChange(options[next].value);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = (idx - 1 + options.length) % options.length;
                onChange(options[prev].value);
              }
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
