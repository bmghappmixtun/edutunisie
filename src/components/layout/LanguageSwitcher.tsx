'use client';
import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';
import { usePathname } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import NextLink from 'next/link';

/**
 * Language Switcher (next-intl version)
 *
 * Smart behavior:
 * - On /fr/* or /ar/* pages: switch to the other locale, keep same page
 * - On non-localized pages (/connexion, /admin, /enseignant, etc):
 *   - Switches to /ar/* (just adds /ar/ prefix)
 *   - This might cause 404 for some non-localized pages, but matches what
 *     the user expects (they clicked "AR" so they want AR content)
 *
 * Wait — actually for non-localized pages, the LanguageSwitcher should NOT
 * add a locale prefix. It should just stay on the same page (since the page
 * doesn't have a localized version).
 *
 * Strategy: if the current pathname is one of the non-localized routes,
 * use plain next/link (no locale prop). Otherwise use next-intl Link with
 * the target locale.
 */
const NON_LOCALIZED_PREFIXES = [
  '/connexion', '/inscription', '/mot-de-passe-oublie',
  '/admin', '/enseignant', '/mon-compte', '/messages',
  '/en-attente', '/verifier', '/invitation', '/api', '/_next',
];

function isNonLocalized(path: string): boolean {
  return NON_LOCALIZED_PREFIXES.some(prefix => path.startsWith(prefix));
}

export default function LanguageSwitcher() {
  const locale = useLocale() as 'fr' | 'ar';
  const pathname = usePathname();
  const targetLocale = locale === 'fr' ? 'ar' : 'fr';
  const targetLabel = locale === 'fr' ? 'AR' : 'FR';

  // On non-localized pages, just stay on the same page (no locale switch)
  // because the page is identical in both languages
  if (isNonLocalized(pathname)) {
    return (
      <NextLink
        href={pathname}
        className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
        title={locale === 'fr' ? 'تغيير اللغة' : 'Changer de langue'}
        aria-label="Language switcher (no effect on this page)"
      >
        <Globe className="w-4 h-4" />
        <span className="font-bold">{targetLabel}</span>
        <span className="text-xs text-slate-400">→ {targetLabel === 'FR' ? 'AR' : 'FR'}</span>
      </NextLink>
    );
  }

  return (
    <Link
      href={pathname}
      locale={targetLocale}
      className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
      title={locale === 'fr' ? 'تغيير اللغة' : 'Changer de langue'}
      aria-label={`Switch to ${targetLocale === 'ar' ? 'Arabic' : 'French'}`}
    >
      <Globe className="w-4 h-4" />
      <span className="font-bold">{targetLabel}</span>
      <span className="text-xs text-slate-400">→ {targetLabel === 'FR' ? 'AR' : 'FR'}</span>
    </Link>
  );
}
