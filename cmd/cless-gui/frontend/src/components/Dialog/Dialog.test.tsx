import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './Dialog';

describe('Dialog component', () => {
  it('renders content when open is true', () => {
    render(
      <Dialog open={true} onOpenChange={() => {}} title="Test Dialog" description="Details">
        <div>Dialog Body Content</div>
      </Dialog>
    );

    expect(screen.getByText('Test Dialog')).toBeDefined();
    expect(screen.getByText('Dialog Body Content')).toBeDefined();
  });

  it('closes when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();
    render(
      <Dialog open={true} onOpenChange={handleOpenChange} title="Accessible Dialog">
        <div>Dialog content</div>
      </Dialog>
    );

    const closeBtn = screen.getByRole('button', { name: /close/i });
    await user.click(closeBtn);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
