import React from 'react';
import {
  ArrowRight,
  FileText,
  Image as ImageIcon,
  FileArchive,
  Music,
  Film,
  Package,
  File,
} from 'lucide-react';
import { Path } from '../Path';

export interface FileRowProps {
  filename: string;
  destPath: string;
  ruleName?: string;
  ruleCategoryIndex?: number; // 0 to 7 mapping to --dot-1 .. --dot-8
  timeAgo?: React.ReactNode;
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

function getRuleDotColor(ruleName?: string, fallbackIndex = 0): string {
  if (!ruleName) return dotColors[fallbackIndex % dotColors.length];
  const lower = ruleName.toLowerCase();
  if (lower.includes('invoice') || lower.includes('finance')) return 'bg-emerald-500';
  if (lower.includes('image') || lower.includes('photo')) return 'bg-cyan-500';
  if (lower.includes('video') || lower.includes('media')) return 'bg-purple-500';
  if (lower.includes('archive') || lower.includes('zip')) return 'bg-amber-500';
  if (lower.includes('doc') || lower.includes('text')) return 'bg-blue-500';
  if (lower.includes('installer') || lower.includes('setup')) return 'bg-rose-500';
  if (lower.includes('audio') || lower.includes('music')) return 'bg-emerald-500';
  return dotColors[fallbackIndex % dotColors.length];
}

function getFileTypeIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'webp', 'svg', 'heic', 'gif'].includes(ext)) {
    return <ImageIcon size={13} strokeWidth={1.75} className="text-cyan-500" />;
  }
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv'].includes(ext)) {
    return <FileText size={13} strokeWidth={1.75} className="text-blue-500" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <FileArchive size={13} strokeWidth={1.75} className="text-amber-500" />;
  }
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) {
    return <Music size={13} strokeWidth={1.75} className="text-emerald-500" />;
  }
  if (['mp4', 'mkv', 'mov', 'avi', 'webm'].includes(ext)) {
    return <Film size={13} strokeWidth={1.75} className="text-purple-500" />;
  }
  if (['exe', 'msi', 'dmg', 'pkg', 'deb', 'AppImage'].includes(ext)) {
    return <Package size={13} strokeWidth={1.75} className="text-rose-500" />;
  }
  return <File size={13} strokeWidth={1.75} className="text-text-3" />;
}

export const FileRow: React.FC<FileRowProps> = ({
  filename,
  destPath,
  ruleName,
  ruleCategoryIndex = 0,
  timeAgo,
  onReveal,
  className = '',
}) => {
  const dotColorClass = getRuleDotColor(ruleName, ruleCategoryIndex);

  return (
    <div
      className={`flex items-center h-10 border-b border-border-subtle last:border-b-0 px-4 bg-bg-surface hover:bg-bg-raised/70 transition-colors duration-fast ease w-full gap-3 select-none ${className}`}
    >
      <div className="flex items-center gap-2.5 w-64 shrink-0 min-w-28">
        <span
          className="flex items-center justify-center w-6 h-6 rounded-md bg-muted/80 border border-border-subtle shrink-0"
          aria-hidden="true"
        >
          {getFileTypeIcon(filename)}
        </span>
        <div
          className="font-mono text-mono font-medium text-text-1 whitespace-nowrap overflow-hidden text-ellipsis"
          title={filename}
        >
          {filename}
        </div>
      </div>

      <div className="text-text-3 flex items-center justify-center w-4 shrink-0">
        <ArrowRight size={12} strokeWidth={1.5} />
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <Path path={destPath} onReveal={onReveal} />
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-auto">
        {ruleName && (
          <div className="inline-flex items-center justify-end w-28">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/70 border border-border-subtle max-w-full">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColorClass}`} />
              <span className="font-sans text-caption font-medium text-text-2 whitespace-nowrap truncate">
                {ruleName}
              </span>
            </span>
          </div>
        )}
        {timeAgo !== undefined && (
          <span className="font-mono text-caption text-text-3 whitespace-nowrap w-12 text-right">
            {timeAgo}
          </span>
        )}
      </div>
    </div>
  );
};
