// SPDX-License-Identifier: AGPL-3.0-only
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Rules } from './Rules';
import { useRulesStore } from '../../state/rulesStore';

describe('Rules Component', () => {
  beforeEach(() => {
    useRulesStore.setState({
      rules: [
        {
          name: 'Invoices',
          disabled: false,
          moveTo: '~/Documents/Finance/{year}',
          match: { ext: ['pdf'], nameRegex: '(?i)(invoice)' },
        },
        {
          name: 'Images',
          disabled: false,
          moveTo: '~/Pictures/Sorted/{year}',
          match: { ext: ['jpg', 'png'] },
        },
      ],
      editingRule: null,
      isNewRule: false,
      externalChangeDetected: false,
      validationErrors: [],
      testResult: null,
      testing: false,
    });
  });

  it('renders rules list with caption and priority ordering', () => {
    render(<Rules />);
    expect(screen.getByText('First match wins.')).toBeDefined();
    expect(screen.getByText('Invoices')).toBeDefined();
    expect(screen.getByText('Images')).toBeDefined();
  });

  it('toggles rule enable/disable state', async () => {
    render(<Rules />);
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBe(2);

    // Toggle Invoices rule
    fireEvent.click(switches[0]);
    await waitFor(() => {
      const updatedRules = useRulesStore.getState().rules;
      expect(updatedRules[0].disabled).toBe(true);
    });
  });

  it('supports keyboard reordering via Alt+ArrowDown', async () => {
    render(<Rules />);
    const dragHandles = screen.getAllByLabelText(/Drag handle for rule/i);
    expect(dragHandles.length).toBe(2);

    // Reorder first rule downwards using Alt+ArrowDown
    fireEvent.keyDown(dragHandles[0].closest('div')!, {
      key: 'ArrowDown',
      altKey: true,
    });

    await waitFor(() => {
      const updatedRules = useRulesStore.getState().rules;
      expect(updatedRules[0].name).toBe('Images');
      expect(updatedRules[1].name).toBe('Invoices');
    });
  });

  it('opens delete confirmation dialog mentioning rule name', async () => {
    const user = userEvent.setup();
    render(<Rules />);
    const menuButtons = screen.getAllByLabelText(/Menu for rule/i);
    await user.click(menuButtons[0]);

    const deleteMenuItem = await screen.findByRole('menuitem', { name: /delete/i });
    await user.click(deleteMenuItem);

    await waitFor(() => {
      expect(screen.getByText(/Delete rule "Invoices"\?/i)).toBeDefined();
    });
  });
});
