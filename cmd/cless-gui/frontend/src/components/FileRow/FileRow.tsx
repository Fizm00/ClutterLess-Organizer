import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Path, formatMiddleEllipsis } from '../Path';
import { cn } from '@/lib/utils';

export interface FileRowProps {
  filename: string;
  destPath: string;
  ruleName?: string;
  ruleCategoryIndex?: number;
  timeAgo?: React.ReactNode;
  onReveal?: (path: string) => void;
  className?: string;
}

export const FileRow: React.FC<FileRowProps> = ({
  filename,
  destPath,
  ruleName,
  timeAgo,
  onReveal,
  className,
}) => {
  const displayFilename = formatMiddleEllipsis(filename, 30);

  return (
    <div
      className={cn(
        'group flex items-center h-9 px-3 hover:bg-muted/50 transition-colors w-full min-w-0 gap-2.5 select-none',
        className
      )}
    >
      <div
        className="font-mono text-xs text-foreground w-44 shrink-0 whitespace-nowrap overflow-hidden text-ellipsis"
        title={filename}
      >
        {displayFilename}
      </div>

      <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />

      <div className="flex-1 min-w-0 overflow-hidden">
        <Path path={destPath} onReveal={onReveal} />
      </div>

      <div className="flex items-center gap-2.5 shrink-0 ml-auto">
        {ruleName && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {ruleName}
          </span>
        )}
        {timeAgo !== undefined && (
          <span className="font-mono text-xs tabular-nums text-muted-foreground whitespace-nowrap w-12 text-right">
            {timeAgo}
          </span>
        )}
      </div>
    </div>
  );
};
