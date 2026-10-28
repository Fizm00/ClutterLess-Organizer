import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './Switch';

describe('Switch component', () => {
  it('toggles when clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Switch label="Enable Watch" checked={false} onCheckedChange={handleChange} />);

    const switchEl = screen.getByRole('switch', { name: /enable watch/i });
    expect(switchEl.getAttribute('aria-checked')).toBe('false');

    await user.click(switchEl);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('supports keyboard operation via Space and Enter keys', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Switch label="Auto Organize" checked={false} onCheckedChange={handleChange} />);

    const switchEl = screen.getByRole('switch', { name: /auto organize/i });
    switchEl.focus();
    expect(document.activeElement).toBe(switchEl);

    await user.keyboard(' ');
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('does not toggle when disabled', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Switch label="Disabled Option" checked={false} disabled onCheckedChange={handleChange} />);

    const switchEl = screen.getByRole('switch', { name: /disabled option/i });
    await user.click(switchEl);
    expect(handleChange).not.toHaveBeenCalled();
  });
});

