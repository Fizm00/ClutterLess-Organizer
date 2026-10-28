// SPDX-License-Identifier: AGPL-3.0-only
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RuleTester } from './RuleTester';
import { useRulesStore } from '../../state/rulesStore';

describe('RuleTester Component', () => {
  beforeEach(() => {
    useRulesStore.setState({
      rules: [
        {
          name: 'Documents',
          disabled: false,
          moveTo: '~/Documents/{year}',
          match: { ext: ['pdf'] },
        },
      ],
      testResult: null,
      testing: false,
    });
  });

  it('evaluates file matching and displays pass/fail condition results', async () => {
    render(<RuleTester initialFilename="invoice_tech_corp_2026_04.pdf" />);
    const testButton = screen.getByRole('button', { name: /test file/i });
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByText('Matched')).toBeDefined();
      expect(screen.getByText(/Rule "Invoices"/i)).toBeDefined();
      expect(screen.getByText(/Destination:/i)).toBeDefined();
    });
  });
});
