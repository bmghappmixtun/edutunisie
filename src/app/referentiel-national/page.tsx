import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ReferentielContent from './ReferentielContent';
import { breadcrumbSchema } from '@/lib/structured-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';

const breadcrumbJsonLd = breadcrumbSchema([
  { name: 'Accueil', url: SITE_URL },
  { name: 'Référentiel National', url: `${SITE_URL}/referentiel-national` },
]);

export const metadata: Metadata = {
  title: 'Référentiel National du Système Éducatif Tunisien — Examanet',
  description:
    "📘 Référentiel national officiel : parcours complet de la 7ème année de base au Baccalauréat tunisien (JORT n° 2019-1085). Toutes les classes, sections et matières avec horaires officiels, conformes au Ministère de l'Éducation.",
  keywords: [
    'référentiel national Tunisie',
    'système éducatif tunisien',
    'programme officiel Ministère Éducation Tunisie',
    'JORT 2019-1085',
    'classes 7ème 8ème 9ème Tunisie',
    'BAC tunisien sections',
    'classes préparatoires Tunisie',
    'horaires officiels Tunisie',
    'examanet programme officiel',
  ],
  alternates: { canonical: `${SITE_URL}/referentiel-national` },
  openGraph: {
    title: 'Référentiel National du Système Éducatif Tunisien',
    description:
      'Carte officielle du parcours scolaire tunisien : 7ème → BAC. Programmes JORT n° 2019-1085.',
    url: `${SITE_URL}/referentiel-national`,
    siteName: 'Examanet',
    locale: 'fr_TN',
    type: 'article',
  },
  robots: { index: true, follow: true },
};

export default function ReferentielNationalPage() {
  // Read the raw HTML source at request time (kept under /content, not /public)
  const filePath = path.join(process.cwd(), 'content', 'referentiel-source.html');
  const rawHtml = fs.readFileSync(filePath, 'utf-8');

  // Extract <style>...</style> CSS
  const styleMatch = rawHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const css = styleMatch ? styleMatch[1] : '';

  // Extract body content (without <body> tags themselves)
  const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : '';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      {/* Inline the page-specific CSS so it scopes itself */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Main content pushed below the fixed Header */}
      <main className="pt-[62px] lg:pt-[73px]">
        <ReferentielContent html={bodyHtml} />
      </main>

      <Footer />
    </>
  );
}
