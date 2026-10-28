import React, { useState, useEffect, useRef } from 'react';
import { FolderOpen, Copy, Check } from 'lucide-react';
import { Tooltip } from '../Tooltip';
import { IconButton } from '../IconButton';
import { t } from '../../i18n';

export interface PathProps {
  path: string;
  onReveal?: (path: string) => void;
  showRevealButton?: boolean;
  className?: string;
}

export function formatMiddleEllipsis(fullPath: string, maxChars: number): string {
  if (!fullPath || fullPath.length <= maxChars || maxChars < 12) {
    return fullPath;
  }

  // Normalize separators for splitting
  const isWindows = fullPath.includes('\\');
  const separator = isWindows ? '\\' : '/';
  const parts = fullPath.split(/[/\\]/);
  const filename = parts[parts.length - 1];

  // If filename alone exceeds maxChars, truncate filename in the middle
  if (filename.length >= maxChars - 4) {
    const half = Math.floor((maxChars - 3) / 2);
    return filename.slice(0, half) + '...' + filename.slice(-half);
  }

  // Preserve filename and root directory, shorten directory path in between
  const remainingForDir = maxChars - filename.length - 4;
  const root = parts[0] + separator;
  const dirMiddle = fullPath.slice(root.length, fullPath.length - filename.length - 1);

  if (remainingForDir <= root.length) {
    return root + '...' + separator + filename;
  }

  const halfDir = Math.floor((remainingForDir - root.length) / 2);
  const head = root + dirMiddle.slice(0, halfDir);
  const tail = dirMiddle.slice(-halfDir);

  return `${head}...${separator}${tail}${separator}${filename}`;
}

export const Path: React.FC<PathProps> = ({
  path: rawPath,
  onReveal,
  showRevealButton = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayText, setDisplayText] = useState(rawPath);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateEllipsis = () => {
      // Average character width for JetBrains Mono 12.5px is ~7.6px
      const availableWidth = el.clientWidth;
      if (availableWidth <= 0) return;

      const approxCharWidth = 7.6;
      const maxChars = Math.max(12, Math.floor(availableWidth / approxCharWidth));
      setDisplayText(formatMiddleEllipsis(rawPath, maxChars));
    };

    updateEllipsis();
    const observer = new ResizeObserver(updateEllipsis);
    observer.observe(el);

    return () => observer.disconnect();
  }, [rawPath]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(rawPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy path:', err);
    }
  };

  return (
    <div className={`inline-flex items-center gap-1 max-w-full min-w-0 ${className}`}>
      <Tooltip content={rawPath}>
        <div
          ref={containerRef}
          className="font-mono text-mono text-text-2 cursor-pointer whitespace-nowrap overflow-hidden rounded-sm px-1 transition-colors duration-fast ease min-w-0 flex-1 hover:text-text-1 hover:bg-bg-raised"
          onClick={handleCopy}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCopy(e as any);
            }
          }}
          title={t('path.copy_path')}
        >
          {displayText}
        </div>
      </Tooltip>

      <div className="inline-flex items-center gap-0.5 shrink-0">
        <Tooltip content={copied ? t('action.copied') : t('path.copy_path')}>
          <button
            type="button"
            className="inline-flex items-center justify-center w-5 h-5 rounded-sm border-none bg-transparent text-text-3 cursor-pointer p-0 transition-colors duration-fast ease hover:text-text-1 hover:bg-bg-raised"
            onClick={handleCopy}
            aria-label={t('action.copy')}
          >
            {copied ? (
              <Check size={13} strokeWidth={2} className="text-success" />
            ) : (
              <Copy size={13} strokeWidth={1.5} />
            )}
          </button>
        </Tooltip>

        {showRevealButton && onReveal && (
          <IconButton
            icon={<FolderOpen size={13} strokeWidth={1.5} />}
            label={t('path.show_in_file_manager')}
            onClick={() => onReveal(rawPath)}
          />
        )}
      </div>
    </div>
  );
};
