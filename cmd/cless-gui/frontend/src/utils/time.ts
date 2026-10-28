// SPDX-License-Identifier: AGPL-3.0-only

/**
 * formatRelativeTime converts an ISO date string or timestamp into a compact relative string
 * as specified in DESIGN.md (e.g. "just now", "1m", "3m", "2h", "1d").
 */
export function formatRelativeTime(isoOrTimestamp: string | number | Date, now: Date = new Date()): string {
  if (!isoOrTimestamp) return '';
  const date = typeof isoOrTimestamp === 'object' ? isoOrTimestamp : new Date(isoOrTimestamp);
  const diffMs = now.getTime() - date.getTime();

  if (isNaN(diffMs) || diffMs < 0) {
    return 'just now';
  }

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) {
    return 'just now';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays}d`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo`;
}

/**
 * formatAbsoluteTime formats a date into standard YYYY-MM-DD HH:mm:ss for tooltips.
 */
export function formatAbsoluteTime(isoOrTimestamp: string | number | Date): string {
  if (!isoOrTimestamp) return '';
  const date = typeof isoOrTimestamp === 'object' ? isoOrTimestamp : new Date(isoOrTimestamp);
  if (isNaN(date.getTime())) return '';

  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

