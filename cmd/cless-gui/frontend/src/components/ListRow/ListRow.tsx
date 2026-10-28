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
  const baseClasses = 'flex items-center h-9 border-b border-border-subtle px-3 font-sans select-none w-full';
  const roleClasses = isHeader
    ? 'bg-transparent text-text-2 text-caption font-medium uppercase tracking-wider'
    : selected
    ? 'bg-bg-selected text-text-1 text-body transition-colors duration-fast ease'
    : 'bg-bg-surface hover:bg-bg-raised text-text-1 text-body transition-colors duration-fast ease';

  return (
    <div className={`${baseClasses} ${roleClasses} ${className}`} role={isHeader ? 'rowheader' : 'row'} {...props}>
      {children}
    </div>
  );
};
