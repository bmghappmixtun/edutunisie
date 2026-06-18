// Server-side i18n utilities (for Server Components)
import { headers, cookies } from 'next/headers';
import fr from '@/messages/fr.json';
import ar from '@/messages/ar.json';

type Locale = 'fr' | 'ar';
type Messages = typeof fr;

const messages: Record<Locale, Messages> = { fr, ar };

function getNested(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export function getServerLocale(): Locale {
  try {
    const cookieStore = cookies();
    const cookieLocale = cookieStore.get('locale')?.value as Locale | undefined;
    if (cookieLocale === 'fr' || cookieLocale === 'ar') return cookieLocale;

    const headerStore = headers();
    const accept = headerStore.get('accept-language') || '';
    if (accept.startsWith('ar')) return 'ar';
  } catch {
    // cookies/headers not available (e.g. in tests/build)
  }
  return 'fr';
}

export function getServerMessages(): Messages {
  return messages[getServerLocale()];
}

export function tServer(key: string, vars?: Record<string, string>, locale?: Locale): string {
  const loc = locale || getServerLocale();
  const value = getNested(messages[loc], key);
  if (typeof value !== 'string') return key;
  if (!vars) return value;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), v),
    value
  );
}

// Backward-compat APIs (used by Header.tsx and others)
export function getDict(): Messages {
  return getServerMessages();
}

export function getT() {
  const locale = getServerLocale();
  return function t(key: string, vars?: Record<string, string>): string {
    return tServer(key, vars, locale);
  };
}

export function getLocale(): Locale {
  return getServerLocale();
}
