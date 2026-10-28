// SPDX-License-Identifier: AGPL-3.0-only
import React, { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder = 'Add extension...',
  disabled = false,
  className,
  'aria-label': ariaLabel,
}) => {
  const [inputValue, setInputValue] = useState('');

  const addTag = (raw: string) => {
    const clean = raw.trim().replace(/^\.+/, '').toLowerCase();
    if (!clean) return;
    if (!tags.includes(clean)) {
      onChange([...tags, clean]);
    }
    setInputValue('');
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 min-h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs transition-colors',
        'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      onClick={e => {
        const input = (e.currentTarget as HTMLDivElement).querySelector('input');
        input?.focus();
      }}
    >
      {tags.map((tag, idx) => (
        <Badge key={`${tag}-${idx}`} variant="secondary" className="gap-1 font-mono text-xs">
          <span>.{tag}</span>
          {!disabled && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                removeTag(idx);
              }}
              className="text-muted-foreground hover:text-foreground rounded-xs p-0.5 focus-visible:outline-none"
              aria-label={`Remove extension ${tag}`}
            >
              <X className="size-3" />
            </button>
          )}
        </Badge>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length === 0 ? placeholder : ''}
        disabled={disabled}
        aria-label={ariaLabel || 'Tag input'}
        className="flex-1 min-w-24 bg-transparent text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none disabled:cursor-not-allowed"
      />
    </div>
  );
};
