'use client';
import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/navigation';

/**
 * Language Switcher (next-intl version)
 *
 * Uses next-intl's `Link` with the `locale` prop to switch languages.
 * - Auto-handles URL prefixing (strips /fr/ when switching to /ar/, adds /ar/ when switching from /fr/)
 * - Preserves the current page (just changes locale)
 * - Updates the NEXT_LOCALE cookie via next-intl
 */
export default function LanguageSwitcher() {
  const locale = useLocale() as 'fr' | 'ar';
  const pathname = usePathname();
  const targetLocale = locale === 'fr' ? 'ar' : 'fr';
  const targetLabel = locale === 'fr' ? 'AR' : 'FR';

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
