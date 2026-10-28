import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Path } from '../Path';

export interface FileRowProps {
  filename: string;
  destPath: string;
  ruleName?: string;
  ruleCategoryIndex?: number; // 0 to 7 mapping to --dot-1 .. --dot-8
  timeAgo?: string;
  onReveal?: (path: string) => void;
  className?: string;
}

const dotColors = [
  'bg-dot-1',
  'bg-dot-2',
  'bg-dot-3',
  'bg-dot-4',
  'bg-dot-5',
  'bg-dot-6',
  'bg-dot-7',
  'bg-dot-8',
];

export const FileRow: React.FC<FileRowProps> = ({
  filename,
  destPath,
  ruleName,
  ruleCategoryIndex = 0,
  timeAgo,
  onReveal,
  className = '',
}) => {
  const dotColorClass = dotColors[ruleCategoryIndex % dotColors.length];

  return (
    <div
      className={`flex items-center h-9 border-b border-border-subtle px-3 bg-bg-surface hover:bg-bg-raised transition-colors duration-fast ease w-full gap-3 select-none ${className}`}
    >
      <div className="font-mono text-mono text-text-1 whitespace-nowrap overflow-hidden text-ellipsis w-60 shrink-0 min-w-24" title={filename}>
        {filename}
      </div>

      <div className="text-text-3 flex items-center shrink-0">
        <ArrowRight size={12} strokeWidth={1.5} />
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <Path path={destPath} onReveal={onReveal} />
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-auto">
        {ruleName && (
          <div className="inline-flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColorClass}`} />
            <span className="font-sans text-small text-text-2 whitespace-nowrap">{ruleName}</span>
          </div>
        )}
        {timeAgo && <span className="font-mono text-caption text-text-3 whitespace-nowrap">{timeAgo}</span>}
      </div>
    </div>
  );
};
