'use client';
import { useI18n } from '@/lib/i18n';
import { Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const router = useRouter();

  function switchLocale() {
    const newLocale = locale === 'fr' ? 'ar' : 'fr';
    // Set cookie (1 year expiry)
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    setLocale(newLocale);
    // Reload to apply translations on server-rendered pages
    router.refresh();
  }

  return (
    <button
      onClick={switchLocale}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
      title="Changer de langue / تغيير اللغة"
    >
      <Globe className="w-4 h-4" />
      <span className="font-bold">{locale === 'fr' ? 'FR' : 'AR'}</span>
      <span className="text-xs text-slate-400">→ {locale === 'fr' ? 'AR' : 'FR'}</span>
    </button>
  );
}