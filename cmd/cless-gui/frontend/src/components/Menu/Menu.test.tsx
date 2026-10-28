import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Menu } from './Menu';

describe('Menu component', () => {
  it('opens on click and executes action on item select', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    render(
      <Menu
        trigger={<button>Options</button>}
        items={[
          { label: 'Edit Rule', onClick: handleEdit },
          { label: 'Delete', danger: true },
        ]}
      />
    );

    const triggerBtn = screen.getByRole('button', { name: 'Options' });
    await user.click(triggerBtn);

    const editItem = await screen.findByRole('menuitem', { name: /edit rule/i });
    expect(editItem).toBeDefined();

    await user.click(editItem);
    expect(handleEdit).toHaveBeenCalled();
  });

  it('navigates menu items via keyboard arrow keys', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    render(
      <Menu
        trigger={<button>Actions</button>}
        items={[
          { label: 'First Item', onClick: handleSelect },
          { label: 'Second Item' },
        ]}
      />
    );

    const triggerBtn = screen.getByRole('button', { name: 'Actions' });
    triggerBtn.focus();
    await user.keyboard('{Enter}');

    const first = await screen.findByRole('menuitem', { name: /first item/i });
    expect(first).toBeDefined();

    await user.keyboard('{ArrowDown}');
    const second = screen.getByRole('menuitem', { name: /second item/i });
    expect(document.activeElement).toBe(second);
  });
});

