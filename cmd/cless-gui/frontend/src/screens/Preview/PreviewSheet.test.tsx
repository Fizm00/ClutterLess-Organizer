// SPDX-License-Identifier: AGPL-3.0-only
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PreviewSheet } from './PreviewSheet';
import { api } from '../../api';

describe('PreviewSheet Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders preview items and updates primary button count when toggling checkboxes', async () => {
    render(<PreviewSheet open={true} onOpenChange={() => {}} />);

    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Will move (3)')).toBeDefined();
    });

    // Check button label matches move count
    const primaryButton = screen.getByRole('button', { name: /Move 3 files/i });
    expect(primaryButton).toBeDefined();
    expect((primaryButton as HTMLButtonElement).disabled).toBe(false);

    // Find and uncheck one of the checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is "select-all", subsequent are items
    fireEvent.click(checkboxes[1]);

    // Button count should decrement to 2
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Move 2 files/i })).toBeDefined();
    });
  });

  it('disables primary move button when 0 items are selected', async () => {
    render(<PreviewSheet open={true} onOpenChange={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Will move (3)')).toBeDefined();
    });

    // Toggle select-all checkbox to deselect all
    const selectAllCheckbox = screen.getByLabelText(/select all files/i);
    fireEvent.click(selectAllCheckbox);

    // Button should be disabled with label "Move 0 files" or equivalent
    await waitFor(() => {
      const moveBtn = screen.getByRole('button', { name: /Move 0 files/i });
      expect((moveBtn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it('executes run with selected IDs when primary button is clicked', async () => {
    const runSpy = vi.spyOn(api.organize, 'run');
    const onOpenChange = vi.fn();

    render(<PreviewSheet open={true} onOpenChange={onOpenChange} />);

    await waitFor(() => {
      expect(screen.getByText('Will move (3)')).toBeDefined();
    });

    const moveBtn = screen.getByRole('button', { name: /Move 3 files/i });
    fireEvent.click(moveBtn);

    await waitFor(() => {
      expect(runSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedIds: expect.arrayContaining(['plan-item-1', 'plan-item-2', 'plan-item-4']),
        })
      );
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
