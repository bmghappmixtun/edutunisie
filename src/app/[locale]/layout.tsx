import type { Metadata } from 'next';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { hasLocale } from 'next-intl';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SyncLocaleAttrs from '@/components/i18n/SyncLocaleAttrs';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-noto-arabic',
  display: 'swap',
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Locale layout for [locale] segment.
 *
 * - NextIntlClientProvider injects messages into the client tree
 * - Header/Footer wrap the page content
 * - No more I18nProvider (old custom system) — that was the source of
 *   "content in AR but URL is /fr" bug because it overrode the locale
 *   based on localStorage
 */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  
  setRequestLocale(locale);
  const messages = await getMessages();
  const isAr = locale === 'ar';

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`${inter.variable} ${notoArabic.variable} ${isAr ? 'font-arabic' : 'font-sans'}`}>
      <body className={isAr ? 'font-arabic' : 'font-sans'}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SyncLocaleAttrs />
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
