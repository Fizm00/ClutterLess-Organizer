// SPDX-License-Identifier: AGPL-3.0-only
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RuleEditor } from './RuleEditor';
import { useRulesStore } from '../../state/rulesStore';

describe('RuleEditor Component', () => {
  beforeEach(() => {
    useRulesStore.setState({
      editingRule: {
        name: 'Documents',
        disabled: false,
        moveTo: '~/Documents/{year}',
        match: { ext: ['pdf', 'docx'] },
      },
      isNewRule: false,
      externalChangeDetected: false,
      validationErrors: [],
    });
  });

  it('renders rule editor dialog with existing values', () => {
    render(<RuleEditor />);
    expect(screen.getByDisplayValue('Documents')).toBeDefined();
    expect(screen.getByDisplayValue('~/Documents/{year}')).toBeDefined();
    expect(screen.getByText('.pdf')).toBeDefined();
    expect(screen.getByText('.docx')).toBeDefined();
  });

  it('inserts template variables into destination when chip is clicked', async () => {
    render(<RuleEditor />);
    const monthChip = screen.getByText('{month}');
    fireEvent.click(monthChip);

    await waitFor(() => {
      const destInput = screen.getByDisplayValue('~/Documents/{year}{month}') as HTMLInputElement;
      expect(destInput).toBeDefined();
    });
  });

  it('toggles read-only YAML view when YAML button is clicked', () => {
    render(<RuleEditor />);
    const yamlButton = screen.getByRole('button', { name: /toggle yaml view/i });
    fireEvent.click(yamlButton);

    expect(screen.getByText(/- name: Documents/i)).toBeDefined();
  });
});
