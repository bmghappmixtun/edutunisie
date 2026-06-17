import { cookies } from 'next/headers';
import fr from '@/messages/fr.json';
import ar from '@/messages/ar.json';

const dictionaries = { fr, ar };
export type Locale = 'fr' | 'ar';

export function getLocaleFromCookies(): Locale {
  const cookieStore = cookies();
  const locale = cookieStore.get('locale')?.value as Locale | undefined;
  return locale === 'ar' ? 'ar' : 'fr';
}

export function getDict(locale?: Locale) {
  const l = locale || getLocaleFromCookies();
  return dictionaries[l];
}

export function getT(locale?: Locale) {
  const dict = getDict(locale);
  return function t(key: string, vars?: Record<string, string>): string {
    const keys = key.split('.');
    let value: any = dict;
    for (const k of keys) {
      value = value?.[k];
    }
    if (typeof value !== 'string') return key;
    if (!vars) return value;
    return Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), v),
      value
    );
  };
}