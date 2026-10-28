// SPDX-License-Identifier: AGPL-3.0-only
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Onboarding } from './Onboarding';
import { useOnboardingStore } from '../../state/onboardingStore';

describe('Onboarding Component', () => {
  beforeEach(() => {
    useOnboardingStore.setState({
      isFirstRun: true,
      step: 1,
      watchFolders: ['~/Downloads'],
      ruleSet: 'recommended',
      autostart: false,
      loading: false,
      previewFiles: [
        { name: 'document.pdf', dest: '~/Documents/Inbox/pdf', rule: 'Documents', size: '2 MB' },
      ],
    });
  });

  it('renders Step 1 with watched folders and advances to Step 2 on Continue', async () => {
    const user = userEvent.setup();
    render(<Onboarding />);

    expect(screen.getByTestId('onboarding-step-1')).toBeDefined();
    expect(screen.getByText('Welcome to ClutterLess')).toBeDefined();

    // Toggle Desktop folder
    const desktopOption = screen.getByTestId('folder-option-desktop');
    await user.click(desktopOption);
    expect(useOnboardingStore.getState().watchFolders).toContain('~/Desktop');

    // Click Continue
    const continueBtn = screen.getByTestId('onboarding-btn-continue');
    await user.click(continueBtn);

    expect(useOnboardingStore.getState().step).toBe(2);
    expect(screen.getByTestId('onboarding-step-2')).toBeDefined();
  });

  it('allows choosing rule set in Step 2 and navigating back and forth', async () => {
    const user = userEvent.setup();
    useOnboardingStore.setState({ step: 2 });
    render(<Onboarding />);

    expect(screen.getByTestId('onboarding-step-2')).toBeDefined();
    expect(screen.getByText('Choose your rules')).toBeDefined();

    // Select Start empty
    const emptyOption = screen.getByTestId('ruleset-option-empty');
    await user.click(emptyOption);
    expect(useOnboardingStore.getState().ruleSet).toBe('empty');

    // Navigate back to Step 1
    const backBtn = screen.getByTestId('onboarding-btn-back');
    await user.click(backBtn);
    expect(useOnboardingStore.getState().step).toBe(1);
  });

  it('renders Step 3 preview and completes setup', async () => {
    const user = userEvent.setup();
    const completeSpy = vi.fn();
    useOnboardingStore.setState({
      step: 3,
      complete: completeSpy,
    });
    render(<Onboarding />);

    expect(screen.getByTestId('onboarding-step-3')).toBeDefined();
    expect(screen.getByText('Ready to organize')).toBeDefined();
    expect(screen.getByText('document.pdf')).toBeDefined();

    // Click Organize files
    const organizeBtn = screen.getByTestId('onboarding-btn-organize');
    await user.click(organizeBtn);
    expect(completeSpy).toHaveBeenCalledWith(true);
  });

  it('allows skipping onboarding directly from step 1', async () => {
    const user = userEvent.setup();
    const skipSpy = vi.fn();
    useOnboardingStore.setState({
      step: 1,
      skip: skipSpy,
    });
    render(<Onboarding />);

    const skipBtn = screen.getByTestId('onboarding-btn-skip');
    await user.click(skipBtn);
    expect(skipSpy).toHaveBeenCalled();
  });
});
