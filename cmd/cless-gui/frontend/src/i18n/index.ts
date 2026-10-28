import { en, TranslationKey } from './en';

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  let str = en[key] as string;
  if (!str) {
    return key;
  }
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}

export * from './en';

