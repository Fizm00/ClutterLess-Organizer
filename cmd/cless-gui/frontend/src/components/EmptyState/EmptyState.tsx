import React from 'react';

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
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-start text-left py-6 gap-2 w-full max-w-dialog ${className}`}>
      <div className="flex items-center gap-2">
        {icon && <span className="flex items-center text-text-3">{icon}</span>}
        <h3 className="font-sans text-subtitle font-semibold text-text-1">{title}</h3>
      </div>
      <p className="font-sans text-body text-text-2">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
