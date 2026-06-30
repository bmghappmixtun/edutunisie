import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import AnalyticsWithOptOut from '@/components/analytics/AnalyticsWithOptOut';
import I18nProviderWrapper from '@/components/layout/I18nProviderWrapper';
import { organizationSchema } from '@/lib/structured-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Examanet — La plateforme pédagogique #1 en Tunisie',
    template: '%s — Examanet'
  },
  description: 'Cours, devoirs, séries, révisions, sujets bac et corrigés — 100% gratuits pour les élèves du Primaire, Collège et Lycée en Tunisie.',
  keywords: ['examanet', 'éducation tunisie', 'cours', 'devoirs', 'bac', 'collège', 'lycée', 'primaire', 'exercices', 'révisions'],
  authors: [{ name: 'Examanet' }],
  creator: 'Examanet',
  publisher: 'Examanet',
  applicationName: 'Examanet',
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
    locale: 'fr_TN',
    url: SITE_URL,
    siteName: 'Examanet',
    title: 'Examanet — La plateforme pédagogique #1 en Tunisie',
    description: 'Cours, devoirs, séries, révisions, sujets bac et corrigés — 100% gratuits pour les élèves tunisiens.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Examanet - Plateforme pédagogique tunisienne',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Examanet — La plateforme pédagogique #1 en Tunisie',
    description: 'Cours, devoirs, séries, révisions, sujets bac et corrigés — 100% gratuits.',
    images: ['/og-image.png'],
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
    canonical: SITE_URL,
  },
  other: {
    'theme-color': '#0EA5E9',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Examanet',
    'mobile-web-app-capable': 'yes',
    'format-detection': 'telephone=no',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0EA5E9',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Cairo:wght@300;400;600;700;900&family=Nunito:wght@500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <I18nProviderWrapper>{children}</I18nProviderWrapper>
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
