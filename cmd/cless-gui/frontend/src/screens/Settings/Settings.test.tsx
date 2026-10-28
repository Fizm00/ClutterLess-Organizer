// SPDX-License-Identifier: AGPL-3.0-only
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Settings } from './Settings';
import { api } from '../../api';
import { useLocaleStore } from '../../i18n';
import { useThemeStore } from '../../store/themeStore';

describe('Settings Screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocaleStore.getState().setLocale('en');
    useThemeStore.getState().setMode('dark');
  });

  it('renders all 5 setting sections with labeled rows', async () => {
    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Appearance' })).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Behavior' })).toBeDefined();
      expect(screen.getByRole('heading', { name: 'System' })).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Data' })).toBeDefined();
      expect(screen.getByRole('heading', { name: 'About' })).toBeDefined();
    });

    expect(screen.getByTestId('settings-screen')).toBeDefined();
    expect(screen.getByTestId('settings-system-section')).toBeDefined();
  });

  it('switches language reactively between English and Indonesian', async () => {
    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Appearance' })).toBeDefined();
    });

    // Switch to Bahasa Indonesia
    const idButton = screen.getByRole('tab', { name: 'Bahasa Indonesia' });
    fireEvent.mouseDown(idButton, { button: 0 });
    fireEvent.click(idButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Tampilan' })).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Perilaku' })).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Sistem' })).toBeDefined();
    });

    // Switch back to English
    const enButton = screen.getByRole('tab', { name: 'English' });
    fireEvent.mouseDown(enButton, { button: 0 });
    fireEvent.click(enButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Appearance' })).toBeDefined();
    });
  });

  it('allows toggling autostart and close to tray switches', async () => {
    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByTestId('switch-autostart')).toBeDefined();
      expect(screen.getByTestId('switch-close-to-tray')).toBeDefined();
    });

    const autostartSwitch = screen.getByTestId('switch-autostart');
    fireEvent.click(autostartSwitch);

    const closeToTraySwitch = screen.getByTestId('switch-close-to-tray');
    fireEvent.click(closeToTraySwitch);
  });

  it('opens confirmation dialog on reset to defaults and confirms', async () => {
    const resetSpy = vi.spyOn(api.config, 'resetToDefaults');
    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-reset-defaults')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('btn-reset-defaults'));

    await waitFor(() => {
      expect(screen.getByText('Reset configuration to defaults?')).toBeDefined();
      expect(screen.getByTestId('btn-confirm-reset')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('btn-confirm-reset'));

    await waitFor(() => {
      expect(resetSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('calls openConfig and openHistory on action button clicks', async () => {
    const openConfigSpy = vi.spyOn(api.system, 'openConfig');
    const openHistorySpy = vi.spyOn(api.system, 'openHistory');

    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open configuration file' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Open history log' })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open configuration file' }));
    expect(openConfigSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Open history log' }));
    expect(openHistorySpy).toHaveBeenCalledTimes(1);
  });
});
