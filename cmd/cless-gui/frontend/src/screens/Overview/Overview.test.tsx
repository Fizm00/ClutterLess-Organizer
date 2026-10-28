// SPDX-License-Identifier: AGPL-3.0-only
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { Overview } from './Overview';
import { useWatchStore } from '../../state/watchStore';
import { useActivityStore } from '../../state/activityStore';

describe('Overview Component', () => {
  beforeEach(() => {
    useWatchStore.setState({
      running: true,
      folders: ['C:/Users/User/Downloads'],
      error: null,
      watcherLocked: false,
      configError: null,
      lastMovedTime: null,
      isLoading: false,
    });

    useActivityStore.setState({
      recentActivity: [],
      needsAttention: [],
      isLoading: false,
    });
  });

  it('renders empty state when no recent activity exists', () => {
    render(<Overview />);
    expect(screen.getByText('Nothing moved yet')).toBeDefined();
    expect(
      screen.getByText('New files in your watched folders will appear here.')
    ).toBeDefined();
    expect(screen.getByText('Organize now')).toBeDefined();
  });

  it('renders recent activity rows when activity exists', () => {
    useActivityStore.setState({
      recentActivity: [
        {
          id: '1',
          filename: 'invoice_april_2026.pdf',
          sourcePath: 'C:/Downloads/invoice_april_2026.pdf',
          destPath: 'Documents/Finance/2026-04/invoice.pdf',
          ruleName: 'Invoices',
          ruleCategoryIndex: 0,
          timestamp: new Date().toISOString(),
          isNew: false,
        },
      ],
    });

    render(<Overview />);
    expect(screen.getByText('invoice_april_2026.pdf')).toBeDefined();
    expect(screen.getByText('Invoices')).toBeDefined();
  });

  it('renders config invalid banner with action buttons', () => {
    useWatchStore.setState({
      configError: {
        path: 'C:/Users/User/.config/cless/config.yaml',
        message: 'mapping values are not allowed',
        line: 14,
      },
    });

    render(<Overview />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText(/Configuration error in/i)).toBeDefined();
    expect(screen.getByText('Open config')).toBeDefined();
    expect(screen.getByText('Retry')).toBeDefined();
  });

  it('renders watcher already running banner when watcherLocked is true', () => {
    useWatchStore.setState({
      watcherLocked: true,
    });

    render(<Overview />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(
      screen.getByText(/A watcher is already running \(cless watch\)/i)
    ).toBeDefined();
    expect(screen.getByText('Retry')).toBeDefined();
  });

  it('renders needs attention section when items exist', () => {
    useActivityStore.setState({
      needsAttention: [
        {
          id: 'skip-1',
          filename: 'video.crdownload',
          sourcePath: 'C:/Downloads/video.crdownload',
          reason: 'still writing',
          type: 'skipped',
          timestamp: new Date().toISOString(),
        },
      ],
    });

    render(<Overview />);
    expect(screen.getByText('Needs attention')).toBeDefined();
    expect(screen.getByText('video.crdownload')).toBeDefined();
    expect(screen.getByText('(still writing)')).toBeDefined();
  });
});
