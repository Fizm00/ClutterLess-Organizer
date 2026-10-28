import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '../../lib/utils';

export interface MenuItemProps {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export interface MenuProps {
  trigger: React.ReactNode;
  items: MenuItemProps[];
  align?: 'start' | 'center' | 'end';
}

export const Menu: React.FC<MenuProps> = ({ trigger, items, align = 'end' }) => {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-44 bg-popover text-popover-foreground border border-border rounded-lg shadow-elevation p-1 z-50 outline-none"
          align={align}
          sideOffset={4}
        >
          {items.map((item, idx) => (
            <DropdownMenu.Item
              key={idx}
              className={cn(
                'relative flex items-center justify-between h-8 px-2.5 rounded-md font-sans text-small cursor-pointer outline-none select-none gap-4 transition-colors duration-fast ease hover:bg-muted focus:bg-muted data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
                item.danger ? 'text-danger' : 'text-foreground'
              )}
              disabled={item.disabled}
              onSelect={item.onClick}
            >
              <div className="flex items-center gap-2">
                {item.icon && (
                  <span className={cn('flex items-center', item.danger ? 'text-danger' : 'text-muted-foreground')}>
                    {item.icon}
                  </span>
                )}
                <span>{item.label}</span>
              </div>
              {item.shortcut && (
                <span className="ml-auto font-mono text-caption tracking-widest text-muted-foreground">
                  {item.shortcut}
                </span>
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
