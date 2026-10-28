// SPDX-License-Identifier: AGPL-3.0-only
import React, { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

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
        'flex flex-wrap items-center gap-1.5 min-h-9 w-full rounded-sm border border-border bg-bg-surface px-2.5 py-1 text-sm transition-colors',
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:border-transparent',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      onClick={e => {
        const input = (e.currentTarget as HTMLDivElement).querySelector('input');
        input?.focus();
      }}
    >
      {tags.map((tag, idx) => (
        <span
          key={`${tag}-${idx}`}
          className="inline-flex items-center gap-1 rounded-xs bg-bg-raised border border-border px-1.5 py-0.5 text-xs font-mono text-text-primary"
        >
          <span>.{tag}</span>
          {!disabled && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                removeTag(idx);
              }}
              className="text-text-muted hover:text-text-primary rounded-xs p-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              aria-label={`Remove extension ${tag}`}
            >
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          )}
        </span>
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
        className="flex-1 min-w-24 bg-transparent text-sm font-mono text-text-primary placeholder:text-text-muted outline-none disabled:cursor-not-allowed"
      />
    </div>
  );
};
