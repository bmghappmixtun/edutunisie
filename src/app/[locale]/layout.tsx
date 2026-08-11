import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { hasLocale } from 'next-intl';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { I18nProvider } from '@/lib/i18n'; // KEEP for backward compat (will be removed in Phase 3)

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// This layout is a CHILD of app/layout.tsx. It does NOT contain <html>/<body>.
// It injects:
// - NextIntlClientProvider for client translations
// - Backward-compat I18nProvider (to be removed in Phase 3)
// - Site header + footer
// - setRequestLocale for static rendering of children
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  
  // Enable static rendering for nested components
  setRequestLocale(locale);
  
  // Get messages for client components
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {/* KEEP old I18nProvider for backward compat during migration - remove in Phase 3 */}
      <I18nProvider initialLocale={locale as 'fr' | 'ar'}>
        <Header />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </I18nProvider>
    </NextIntlClientProvider>
  );
}
