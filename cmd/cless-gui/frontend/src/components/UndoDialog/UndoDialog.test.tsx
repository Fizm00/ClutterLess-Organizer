// SPDX-License-Identifier: AGPL-3.0-only
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UndoDialog } from './UndoDialog';
import { api } from '../../api';

describe('UndoDialog Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders undo preview and confirms restoration', async () => {
    const undoSpy = vi.spyOn(api.history, 'undo');
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    render(
      <UndoDialog
        batchId="batch-test-123"
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />
    );

    // Wait for undo preview to load
    await waitFor(() => {
      expect(screen.getByText(/Undo batch batch-test-123\?/i)).toBeDefined();
      expect(
        screen.getByText(/The following files will be restored to their original locations. This action is final./i)
      ).toBeDefined();
    });

    const confirmButton = screen.getByRole('button', { name: /Restore 3 files/i });
    expect(confirmButton).toBeDefined();

    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(undoSpy).toHaveBeenCalledWith('batch-test-123');
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});

