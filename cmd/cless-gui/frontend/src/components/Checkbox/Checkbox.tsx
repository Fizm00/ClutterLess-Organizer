import React from 'react';
import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

export interface CheckboxProps {
  checked: boolean | 'indeterminate';
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  id,
  className = '',
}) => {
  const checkboxId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <RadixCheckbox.Root
        id={checkboxId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="flex items-center justify-center w-4 h-4 rounded-sm border border-border bg-bg-surface cursor-pointer p-0 transition-colors duration-fast ease hover:not-disabled:border-border-strong data-[state=checked]:bg-accent data-[state=checked]:border-accent data-[state=checked]:text-on-accent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RadixCheckbox.Indicator className="flex items-center justify-center text-on-accent">
          <Check size={12} strokeWidth={2.5} />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {label && (
        <label htmlFor={checkboxId} className="font-sans text-body text-text-1 cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
};
