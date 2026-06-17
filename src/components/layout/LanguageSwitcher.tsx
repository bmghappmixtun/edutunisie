'use client';
import { useI18n } from '@/lib/i18n';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <button
      onClick={() => setLocale(locale === 'fr' ? 'ar' : 'fr')}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
      title="Changer de langue / تغيير اللغة"
    >
      <Globe className="w-4 h-4" />
      <span className="font-bold">{locale === 'fr' ? 'FR' : 'AR'}</span>
      <span className="text-xs text-slate-400">→ {locale === 'fr' ? 'AR' : 'FR'}</span>
    </button>
  );
}