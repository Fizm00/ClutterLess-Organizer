import React from 'react';
import * as RadixSwitch from '@radix-ui/react-switch';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  id?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  description,
  id,
}) => {
  const switchId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex items-center justify-between gap-4 w-full">
      {(label || description) && (
        <div className="flex flex-col gap-1">
          {label && (
            <label htmlFor={switchId} className="font-sans text-body text-text-1 cursor-pointer">
              {label}
            </label>
          )}
          {description && <span className="font-sans text-small text-text-2">{description}</span>}
        </div>
      )}
      <RadixSwitch.Root
        id={switchId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="w-7 h-4 bg-border rounded-full relative border-none cursor-pointer p-0 shrink-0 transition-colors duration-fast ease data-[state=checked]:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RadixSwitch.Thumb className="block w-3 h-3 bg-on-accent rounded-full transition-transform duration-fast ease translate-x-0.5 data-[state=checked]:translate-x-3.5" />
      </RadixSwitch.Root>
    </div>
  );
};
