// SPDX-License-Identifier: AGPL-3.0-only
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Folders } from './Folders';
import { useFoldersStore } from '../../state/foldersStore';

describe('Folders Component', () => {
  beforeEach(() => {
    useFoldersStore.setState({
      folders: [
        { path: '~/Downloads', recursive: true },
        { path: '~/Desktop', recursive: false },
      ],
      fileCounts: {
        '~/Downloads': 24,
        '~/Desktop': 8,
      },
      warnings: [
        {
          folderPath: '~/Downloads',
          ruleName: 'Archives',
          moveTo: '~/Downloads/_Archives',
          message:
            'Rule "Archives" destination (~/Downloads/_Archives) is inside this recursive folder.',
        },
      ],
      loading: false,
      error: null,
    });
  });

  it('renders watched folders with paths, recursive toggle, and file count', () => {
    render(<Folders />);
    expect(screen.getByText('~/Downloads')).toBeDefined();
    expect(screen.getByText('~/Desktop')).toBeDefined();
    expect(screen.getByText('24 files')).toBeDefined();
    expect(screen.getByText('8 files')).toBeDefined();
  });

  it('displays inline warning when destination is inside recursive folder', () => {
    render(<Folders />);
    expect(
      screen.getByText(/Warning: Rule "Archives" destination \(~\/Downloads\/_Archives\) is inside this recursive folder\./i)
    ).toBeDefined();
  });

  it('opens confirmation dialog on remove folder', async () => {
    const user = userEvent.setup();
    render(<Folders />);
    const menuButtons = screen.getAllByLabelText(/Menu for/i);
    await user.click(menuButtons[0]);

    const deleteMenuItem = await screen.findByRole('menuitem', { name: /delete/i });
    await user.click(deleteMenuItem);

    await waitFor(() => {
      expect(screen.getByText(/Stop watching ~\/Downloads\?/i)).toBeDefined();
    });
  });
});
