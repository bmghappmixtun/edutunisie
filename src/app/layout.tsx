import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Inter, Cairo, Nunito } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import AnalyticsWithOptOut from '@/components/analytics/AnalyticsWithOptOut';
import I18nProviderWrapper from '@/components/layout/I18nProviderWrapper';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { organizationSchema } from '@/lib/structured-data';
import { getServerLocale } from '@/lib/i18n-server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';

// PERF: Self-host Google Fonts via next/font — eliminates the render-blocking
// external CSS request to fonts.googleapis.com (was ~150ms TTFB on cold visits,
// especially on 3G networks in Tunisia). Also: subset to latin + latin-ext
// + arabic to avoid downloading unused glyphs (~30% smaller).
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700', '800'],
  preload: true,
});
const cairo = Cairo({
  subsets: ['arabic', 'latin-ext'],
  display: 'swap',
  variable: '--font-cairo',
  weight: ['400', '600', '700', '800'],
  preload: true,
});
const nunito = Nunito({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-nunito',
  weight: ['600', '700', '800', '900'],
  preload: false,
});

// SEO: per-locale default metadata. The template is added per-locale so
// children pages never need to worry about i18n.
const LOCALE_DEFAULTS = {
  fr: {
    title: 'Examanet — La plateforme pédagogique #1 en Tunisie',
    description: 'Cours, devoirs, séries, révisions, sujets bac et corrigés — 100% gratuits pour les élèves du Primaire, Collège et Lycée en Tunisie.',
    ogTitle: 'Examanet — La plateforme pédagogique #1 en Tunisie',
    ogDescription: 'Cours, devoirs, séries, révisions, sujets bac et corrigés — 100% gratuits pour les élèves tunisiens.',
    twitterTitle: 'Examanet — La plateforme pédagogique #1 en Tunisie',
    twitterDescription: 'Cours, devoirs, séries, révisions, sujets bac et corrigés — 100% gratuits.',
  },
  ar: {
    title: 'إكسامانت — المنصة التربوية #1 في تونس',
    description: 'دروس، فروض، سلاسل، ملخصات، مواضيع باكالوريا وإصلاحات — مجانية 100% لتلاميذ الابتدائي، الإعدادي والثانوي في تونس.',
    ogTitle: 'إكسامانت — المنصة التربوية #1 في تونس',
    ogDescription: 'دروس، فروض، ملخصات، مواضيع باك وإصلاحات — مجانية 100% للتلاميذ التونسيين.',
    twitterTitle: 'إكسامانت — المنصة التربوية #1 في تونس',
    twitterDescription: 'دروس، فروض، ملخصات، مواضيع باك وإصلاحات — مجانية 100%.',
  },
} as const;

// Function-based metadata so it can read the locale at request time
// (the previous static `export const metadata` always used FR).
export async function generateMetadata(): Promise<Metadata> {
  const locale = getServerLocale();
  const isAr = locale === 'ar';
  const t = LOCALE_DEFAULTS[locale];
  const canonical = isAr ? `${SITE_URL}/ar` : SITE_URL;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t.title,
      // Per-locale template so the suffix never duplicates the site name
      // (was causing "— Examanet — Examanet" on several pages).
      template: isAr ? '%s — إكسامانت' : '%s — Examanet',
    },
    description: t.description,
    keywords: isAr
      ? ['إكسامانت', 'تعليم تونس', 'دروس', 'فروض', 'باكالوريا', 'إعدادي', 'ثانوي', 'ابتدائي', 'تمارين', 'مراجعة']
      : ['examanet', 'éducation tunisie', 'cours', 'devoirs', 'bac', 'collège', 'lycée', 'primaire', 'exercices', 'révisions'],
    authors: [{ name: 'Examanet' }],
    creator: 'Examanet',
    publisher: 'Examanet',
    applicationName: isAr ? 'إكسامانت' : 'Examanet',
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
        { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
        { url: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
      ],
      apple: [
        { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    manifest: '/manifest.json',
    openGraph: {
      type: 'website',
      locale: isAr ? 'ar_TN' : 'fr_TN',
      url: canonical,
      siteName: isAr ? 'إكسامانت' : 'Examanet',
      title: t.ogTitle,
      description: t.ogDescription,
      images: [
        {
          url: '/api/og/page/home',
          width: 1200,
          height: 630,
          alt: isAr ? 'إكسامانت - المنصة التربوية التونسية' : 'Examanet - Plateforme pédagogique tunisienne',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t.twitterTitle,
      description: t.twitterDescription,
      images: ['/api/og/page/home'],
      creator: '@examanet',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical,
      languages: {
        'fr-TN': SITE_URL,
        'ar-TN': `${SITE_URL}/ar`,
        'x-default': SITE_URL,
      },
    },
    other: {
      'theme-color': '#0EA5E9',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'apple-mobile-web-app-title': isAr ? 'إكسامانت' : 'Examanet',
      'mobile-web-app-capable': 'yes',
      'format-detection': 'telephone=no',
      // Google Search Console verification
      'google-site-verification': 'GXE5A9gq9-K7q7IztCatkSHhYrgtWWBbPloJymofPUY',
      // Bing Webmaster Tools verification
      'msvalidate.01': 'C04AC04227DB04DAC96552F4A27BCD73',
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0EA5E9',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read locale from middleware-set header (for /ar/* URLs)
  const headerStore = await headers();
  const xLocale = headerStore.get('x-locale');
  const locale: 'fr' | 'ar' = xLocale === 'ar' ? 'ar' : 'fr';
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} className={`${inter.variable} ${cairo.variable} ${nunito.variable}`} suppressHydrationWarning>
      <head>
        {/* Explicit Google site verification meta tag (HTML tag verification) */}
        <meta name="google-site-verification" content="GXE5A9gq9-K7q7IztCatkSHhYrgtWWBbPloJymofPUY" />
        {/* Bing Webmaster Tools verification meta tag (HTML tag verification) */}
        <meta name="msvalidate.01" content="C04AC04227DB04DAC96552F4A27BCD73" />
        {/* OpenGraph locale: dynamic based on x-locale header (set by middleware for /ar/*) */}
        <meta property="og:locale" content={locale === 'ar' ? 'ar_TN' : 'fr_TN'} />
        {/* Twitter locale for AR */}
        <meta name="twitter:card" content="summary_large_image" />
        {/* Hreflang: FR is canonical, AR is at /ar/* prefix, x-default points to FR. */}
        <link rel="alternate" hrefLang="fr-TN" href={SITE_URL} />
        <link rel="alternate" hrefLang="ar-TN" href={`${SITE_URL}/ar`} />
        <link rel="alternate" hrefLang="x-default" href={SITE_URL} />
      </head>
      <body className="font-sans">
        <NuqsAdapter>
          <I18nProviderWrapper initialLocale={(() => { try { const h = headers(); const l = h.get('x-locale'); return l === 'ar' || l === 'fr' ? l : 'fr'; } catch { return 'fr'; } })()}>{children}</I18nProviderWrapper>
        </NuqsAdapter>
        <Toaster position="top-right" toastOptions={{
          style: { borderRadius: '12px', background: '#0F172A', color: '#fff' }
        }} />
        {/* Organization + WebSite + SearchAction JSON-LD — enables Google knowledge panel + sitelinks searchbox */}
        {organizationSchema().map((schema, i) => (
          <script
            key={`org-schema-${i}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
        <AnalyticsWithOptOut />
      </body>
    </html>
  );
}
