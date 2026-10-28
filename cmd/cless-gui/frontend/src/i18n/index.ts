// SPDX-License-Identifier: AGPL-3.0-only
import { create } from 'zustand';
import { en, TranslationKey } from './en';
import { id } from './id';

export type Locale = 'en' | 'id';

interface LocaleStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const getInitialLocale = (): Locale => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem('cless-locale');
    if (saved === 'en' || saved === 'id') {
      return saved;
    }
  }
  return 'en';
};

export const useLocaleStore = create<LocaleStore>(set => ({
  locale: getInitialLocale(),
  setLocale: (locale: Locale) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('cless-locale', locale);
    }
    set({ locale });
  },
}));

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const currentLocale = useLocaleStore.getState().locale;
  const dict = currentLocale === 'id' ? id : en;
  let str = dict[key] || en[key] || (key as string);

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}

export * from './en';
export { id } from './id';
