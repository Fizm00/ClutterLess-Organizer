import React, { useState, useEffect, useRef } from 'react';
import { FolderOpen, Copy, Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

export interface PathProps {
  path: string;
  maxChars?: number;
  onReveal?: (path: string) => void;
  showRevealButton?: boolean;
  className?: string;
}

export function formatMiddleEllipsis(fullPath: string, maxChars: number): string {
  if (!fullPath || fullPath.length <= maxChars || maxChars < 12) {
    return fullPath;
  }

  const isWindows = fullPath.includes('\\');
  const separator = isWindows ? '\\' : '/';
  const parts = fullPath.split(/[/\\]/);
  const filename = parts[parts.length - 1];

  if (parts.length <= 1) {
    const half = Math.floor((maxChars - 3) / 2);
    return filename.slice(0, half) + '...' + filename.slice(-half);
  }

  const root = parts[0] + separator;

  if (filename.length >= maxChars - root.length - 4) {
    const availableForFile = Math.max(8, maxChars - root.length - 4);
    const tailLen = Math.max(4, Math.floor(availableForFile * 0.6));
    const headLen = Math.max(3, availableForFile - tailLen - 3);
    return `${root}...${separator}${filename.slice(0, headLen)}...${filename.slice(-tailLen)}`;
  }

  const remainingForDir = maxChars - filename.length - 4;
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
  maxChars: propMaxChars = 38,
  onReveal,
  showRevealButton = true,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayText, setDisplayText] = useState(() =>
    formatMiddleEllipsis(rawPath, propMaxChars)
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDisplayText(formatMiddleEllipsis(rawPath, propMaxChars));
    const el = containerRef.current;
    if (!el) return;

    const updateEllipsis = () => {
      const availableWidth = el.clientWidth;
      if (availableWidth <= 0) return;

      const approxCharWidth = 7.6;
      const computedMax = Math.min(
        propMaxChars,
        Math.max(16, Math.floor(availableWidth / approxCharWidth))
      );
      setDisplayText(formatMiddleEllipsis(rawPath, computedMax));
    };

    updateEllipsis();
    const observer = new ResizeObserver(updateEllipsis);
    observer.observe(el);

    return () => observer.disconnect();
  }, [rawPath, propMaxChars]);

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
    <TooltipProvider delayDuration={300}>
      <div className={cn('group/path inline-flex items-center gap-1 max-w-full min-w-0', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              ref={containerRef}
              className="font-mono text-xs text-muted-foreground cursor-pointer whitespace-nowrap overflow-hidden rounded px-1 transition-colors min-w-0 flex-1 hover:text-foreground"
              onClick={handleCopy}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  void handleCopy(e as unknown as React.MouseEvent);
                }
              }}
              title={rawPath}
            >
              {displayText}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <span className="font-mono text-xs">{rawPath}</span>
          </TooltipContent>
        </Tooltip>

        <div className="inline-flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 group-hover/path:opacity-100 focus-within:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
                aria-label={t('action.copy')}
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{copied ? t('action.copied') : t('path.copy_path')}</TooltipContent>
          </Tooltip>

          {showRevealButton && onReveal && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={e => {
                    e.stopPropagation();
                    onReveal(rawPath);
                  }}
                  aria-label={t('path.show_in_file_manager')}
                >
                  <FolderOpen className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('path.show_in_file_manager')}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
