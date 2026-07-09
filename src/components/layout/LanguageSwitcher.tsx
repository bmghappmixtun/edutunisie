'use client';
import { useI18n } from '@/lib/i18n';
import { Globe } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * AR URL Routing Aware Language Switcher
 *
 * - On FR page: clicking AR navigates to /ar/{current-path}
 * - On AR page: clicking FR navigates to {path without /ar prefix}
 * - Maintains search params
 * - Updates locale cookie too (for SSR consistency)
 */
export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSearch(window.location.search);
  }, [pathname]);

  function switchLocale() {
    const newLocale = locale === 'fr' ? 'ar' : 'fr';
    // Compute target URL
    let targetPath: string;
    if (newLocale === 'ar') {
      // Add /ar prefix if not already present
      targetPath = pathname.startsWith('/ar') ? pathname : `/ar${pathname === '/' ? '' : pathname}`;
    } else {
      // Remove /ar prefix
      targetPath = pathname.replace(/^\/ar/, '') || '/';
    }

    // Set cookie for SSR consistency (1 year)
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    setLocale(newLocale);

    // Navigate to new URL (real URL change — shareable)
    router.push(targetPath + search);
  }

  return (
    <button
      onClick={switchLocale}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
      title="Changer de langue / تغيير اللغة"
      aria-label={`Switch to ${locale === 'fr' ? 'Arabic' : 'French'}`}
    >
      <Globe className="w-4 h-4" />
      <span className="font-bold">{locale === 'fr' ? 'FR' : 'AR'}</span>
      <span className="text-xs text-slate-400">→ {locale === 'fr' ? 'AR' : 'FR'}</span>
    </button>
  );
}
