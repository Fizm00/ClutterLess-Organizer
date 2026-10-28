import React from 'react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-start text-left py-8 px-2 gap-2.5 w-full max-w-dialog', className)}>
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="flex items-center justify-center w-8 h-8 rounded-md bg-muted border border-border-subtle text-muted-foreground shadow-xs shrink-0">
            {icon}
          </span>
        )}
        <div className="flex flex-col gap-0.5">
          <h3 className="font-sans text-subtitle font-semibold tracking-tight text-foreground">{title}</h3>
          <p className="font-sans text-body text-muted-foreground">{description}</p>
        </div>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
