// SPDX-License-Identifier: AGPL-3.0-only
import { describe, it, expect } from 'vitest';
import { formatRelativeTime, formatAbsoluteTime } from './time';

describe('formatRelativeTime', () => {
  const baseNow = new Date('2026-04-18T14:30:00Z');

  it('formats recent times within 45s as just now', () => {
    const recent = new Date('2026-04-18T14:29:30Z');
    expect(formatRelativeTime(recent, baseNow)).toBe('just now');
  });

  it('formats minutes ago', () => {
    const threeMinAgo = new Date('2026-04-18T14:27:00Z');
    expect(formatRelativeTime(threeMinAgo, baseNow)).toBe('3m');

    const tenMinAgo = new Date('2026-04-18T14:20:00Z');
    expect(formatRelativeTime(tenMinAgo, baseNow)).toBe('10m');
  });

  it('formats hours ago', () => {
    const twoHoursAgo = new Date('2026-04-18T12:30:00Z');
    expect(formatRelativeTime(twoHoursAgo, baseNow)).toBe('2h');
  });

  it('formats days ago', () => {
    const threeDaysAgo = new Date('2026-04-15T14:30:00Z');
    expect(formatRelativeTime(threeDaysAgo, baseNow)).toBe('3d');
  });

  it('formats future or empty dates safely', () => {
    expect(formatRelativeTime('', baseNow)).toBe('');
    const future = new Date('2026-04-18T14:35:00Z');
    expect(formatRelativeTime(future, baseNow)).toBe('just now');
  });
});

describe('formatAbsoluteTime', () => {
  it('formats valid ISO dates into YYYY-MM-DD HH:mm:ss format', () => {
    const d = new Date(2026, 3, 18, 14, 22, 5); // Month 3 is April
    expect(formatAbsoluteTime(d)).toBe('2026-04-18 14:22:05');
  });

  it('handles empty input gracefully', () => {
    expect(formatAbsoluteTime('')).toBe('');
  });
});
