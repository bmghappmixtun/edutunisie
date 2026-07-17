'use client';
import { useI18n } from '@/lib/i18n';

/**
 * Translator component - use anywhere you need translated text
 * Usage: <T k="common.search" /> or <T k="home.heroTitle" />
 *        <T k="home.heroSubtitle" vars={{strong: '<strong>', strongEnd: '</strong>'}} />
 */
export default function T({ k, vars }: { k: string; vars?: Record<string, string> }) {
  const { t } = useI18n();
  return <>{t(k, vars)}</>;
}

/**
 * Server-side translator (for use in server components)
 * Returns a function that does the lookup
 */
export function createT(locale: 'fr' | 'ar') {
  return function t(key: string, vars?: Record<string, string>): string {
    // Dynamic import to avoid bundling in client
    const messages =
      locale === 'ar' ? require('@/messages/ar.json') : require('@/messages/fr.json');
    const keys = key.split('.');
    let value: any = messages;
    for (const k of keys) {
      value = value?.[k];
    }
    if (typeof value !== 'string') return key;
    if (!vars) return value;
    return Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), v),
      value,
    );
  };
}
