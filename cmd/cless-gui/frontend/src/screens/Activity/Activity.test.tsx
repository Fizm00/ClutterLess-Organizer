// SPDX-License-Identifier: AGPL-3.0-only
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Activity } from './Activity';
import { useActivityStore } from '../../state/activityStore';

describe('Activity Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useActivityStore.setState({
      batches: [
        {
          id: 'batch-20260418-142200',
          time: new Date().toISOString(),
          total: 3,
          moved: 3,
          undone: 0,
          allUndone: false,
        },
        {
          id: 'batch-20260417-093000',
          time: new Date(Date.now() - 86400000).toISOString(),
          total: 5,
          moved: 5,
          undone: 5,
          allUndone: true,
        },
      ],
      batchDetails: {},
      expandedBatchIds: {},
      isLoading: false,
    });
  });

  it('renders batches with their respective status badges and IDs', async () => {
    render(<Activity />);

    expect(screen.getByText('batch-20260418-142200')).toBeDefined();
    expect(screen.getByText('batch-20260417-093000')).toBeDefined();

    expect(screen.getAllByText('Applied').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Undone').length).toBeGreaterThan(0);
  });

  it('filters batches using the segmented status filter', async () => {
    render(<Activity />);

    // Click 'Undone' filter
    const undoneSegment = screen.getByRole('radio', { name: 'Undone' });
    fireEvent.click(undoneSegment);

    await waitFor(() => {
      expect(screen.queryByText('batch-20260418-142200')).toBeNull();
      expect(screen.getByText('batch-20260417-093000')).toBeDefined();
    });

    // Click 'Applied' filter
    const appliedSegment = screen.getByRole('radio', { name: 'Applied' });
    fireEvent.click(appliedSegment);

    await waitFor(() => {
      expect(screen.getByText('batch-20260418-142200')).toBeDefined();
      expect(screen.queryByText('batch-20260417-093000')).toBeNull();
    });
  });

  it('filters batches by search input matching batch ID', async () => {
    render(<Activity />);

    const searchInput = screen.getByPlaceholderText(/Filter by filename or destination/i);
    fireEvent.change(searchInput, { target: { value: '142200' } });

    await waitFor(() => {
      expect(screen.getByText('batch-20260418-142200')).toBeDefined();
      expect(screen.queryByText('batch-20260417-093000')).toBeNull();
    });
  });

  it('opens undo dialog when clicking Undo batch', async () => {
    render(<Activity />);

    const undoButtons = screen.getAllByRole('button', { name: /Undo batch/i });
    // First button is for the active batch
    fireEvent.click(undoButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Undo batch batch-20260418-142200\?/i)).toBeDefined();
    });
  });
});
