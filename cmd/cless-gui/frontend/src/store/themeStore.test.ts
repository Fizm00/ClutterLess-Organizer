import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from './themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('sets light theme mode and applies data-theme="light" attribute', () => {
    const { setMode } = useThemeStore.getState();
    setMode('light');

    expect(useThemeStore.getState().mode).toBe('light');
    expect(useThemeStore.getState().resolvedTheme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('cless-theme')).toBe('light');
  });

  it('sets dark theme mode and removes data-theme attribute', () => {
    const { setMode } = useThemeStore.getState();
    setMode('dark');

    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    expect(localStorage.getItem('cless-theme')).toBe('dark');
  });
});

