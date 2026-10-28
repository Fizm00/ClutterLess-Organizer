import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

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
          className="min-w-40 bg-bg-surface border border-border rounded-md shadow-elevation p-1 z-50 outline-none"
          align={align}
          sideOffset={4}
        >
          {items.map((item, idx) => (
            <DropdownMenu.Item
              key={idx}
              className={`flex items-center justify-between h-7 px-2 rounded-sm font-sans text-small cursor-pointer outline-none select-none gap-4 transition-colors duration-fast ease hover:bg-bg-raised focus:bg-bg-raised data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed ${
                item.danger ? 'text-danger' : 'text-text-1'
              }`}
              disabled={item.disabled}
              onSelect={item.onClick}
            >
              <div className="flex items-center gap-2">
                {item.icon && (
                  <span className={`flex items-center ${item.danger ? 'text-danger' : 'text-text-2'}`}>
                    {item.icon}
                  </span>
                )}
                <span>{item.label}</span>
              </div>
              {item.shortcut && (
                <span className="font-mono text-caption text-text-3">{item.shortcut}</span>
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
