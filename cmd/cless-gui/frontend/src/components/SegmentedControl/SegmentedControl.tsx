import React from 'react';
import { cn } from '../../lib/utils';

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
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex h-8 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground border border-border-subtle select-none gap-0.5',
        className
      )}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map(opt => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            className={cn(
              'inline-flex items-center justify-center h-6 px-3 rounded-md border font-sans text-small whitespace-nowrap cursor-pointer transition-all duration-fast ease',
              isSelected
                ? 'bg-bg-surface text-foreground font-medium border-border shadow-xs'
                : 'border-transparent bg-transparent text-muted-foreground font-regular hover:text-foreground'
            )}
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
