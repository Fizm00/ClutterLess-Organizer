import React from 'react';

export interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  isHeader?: boolean;
  children: React.ReactNode;
}

export const ListRow: React.FC<ListRowProps> = ({
  selected = false,
  isHeader = false,
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'flex items-center border-b border-border-subtle px-3.5 font-sans select-none w-full gap-3';
  const roleClasses = isHeader
    ? 'h-8 bg-bg-raised text-text-3 text-caption font-medium uppercase tracking-wider'
    : selected
    ? 'h-9 bg-bg-selected text-text-1 text-body transition-colors duration-fast ease'
    : 'h-9 bg-bg-surface hover:bg-bg-raised text-text-1 text-body transition-colors duration-fast ease';

  return (
    <div className={`${baseClasses} ${roleClasses} ${className}`} role={isHeader ? 'rowheader' : 'row'} {...props}>
      {children}
    </div>
  );
};
