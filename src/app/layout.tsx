import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import I18nProviderWrapper from '@/components/layout/I18nProviderWrapper';

export const metadata: Metadata = {
  title: 'EduTunisie — La plateforme pédagogique #1 en Tunisie',
  description: 'Cours, devoirs, séries, révisions, sujets bac et corrigés gratuits pour les élèves tunisiens.',
  keywords: 'éducation tunisie, cours, devoirs, bac, collège, lycée, primaire, exercices',
  openGraph: {
    title: 'EduTunisie',
    description: 'La plateforme pédagogique #1 en Tunisie',
    type: 'website',
    locale: 'fr_TN',
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Cairo:wght@300;400;600;700;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <I18nProviderWrapper>{children}</I18nProviderWrapper>
        <Toaster position="top-right" toastOptions={{
          style: { borderRadius: '12px', background: '#0F172A', color: '#fff' }
        }} />
      </body>
    </html>
  );
}
