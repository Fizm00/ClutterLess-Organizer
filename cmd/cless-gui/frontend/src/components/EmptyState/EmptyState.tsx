import React from 'react';
import { cn } from '@/lib/utils';

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
    <div className={cn('flex flex-col items-start text-left py-6 gap-2 w-full', className)}>
      <div className="flex items-center gap-2 text-foreground">
        {icon && <span className="text-muted-foreground shrink-0 [&_svg]:size-4">{icon}</span>}
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      {action && <div className=" pt-1">{action}</div>}
    </div>
  );
};
