import React from 'react';
import * as RadixSwitch from '@radix-ui/react-switch';
import { cn } from '../../lib/utils';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  id?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  description,
  id,
  className,
}) => {
  const switchId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={cn('flex items-center justify-between gap-4 w-full', className)}>
      {(label || description) && (
        <div className="flex flex-col gap-0.5">
          {label && (
            <label
              htmlFor={switchId}
              className="font-sans text-body font-medium text-foreground cursor-pointer select-none"
            >
              {label}
            </label>
          )}
          {description && (
            <span className="font-sans text-small text-muted-foreground">{description}</span>
          )}
        </div>
      )}
      <RadixSwitch.Root
        id={switchId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-border shadow-xs transition-colors duration-fast ease data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-50 p-0"
      >
        <RadixSwitch.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-bg-surface data-[state=checked]:bg-primary-foreground shadow-sm transition-transform duration-fast ease translate-x-0 data-[state=checked]:translate-x-4" />
      </RadixSwitch.Root>
    </div>
  );
};
