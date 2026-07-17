import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ReferentielContent from './ReferentielContent';
import { getLocale } from '@/lib/i18n-server';
import { breadcrumbSchema } from '@/lib/structured-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';

const breadcrumbJsonLd = breadcrumbSchema([
  { name: 'Accueil', url: SITE_URL },
  { name: 'Référentiel National', url: `${SITE_URL}/referentiel-national` },
]);

export async function generateMetadata(): Promise<Metadata> {
  const locale = getLocale();
  const isAr = locale === 'ar';
  return {
    title: isAr
      ? 'المرجع الوطني للمنظومة التربوية التونسية'
      : 'Référentiel National du Système Éducatif Tunisien',
    description: isAr
      ? '📘 المرجع الوطني الرسمي: المسار الكامل من السنة السابعة أساسي إلى الباكالوريا التونسية (الرائد الرسمي عدد 2019-1085). جميع الأقسام والشعب والمواد مع الحصص الرسمية، وفقاً لوزارة التربية.'
      : "📘 Référentiel national officiel : parcours complet de la 7ème année de base au Baccalauréat tunisien (JORT n° 2019-1085). Toutes les classes, sections et matières avec horaires officiels, conformes au Ministère de l'Éducation.",
    keywords: isAr ? [
      'المرجع الوطني تونس',
      'المنظومة التربوية التونسية',
      'البرنامج الرسمي وزارة التربية',
      'الرائد الرسمي 2019-1085',
      'الأقسام السابعة والثامنة والتاسعة تونس',
      'شعبة الباكالوريا تونس',
      'الباكالوريا التونسية',
      'إصلاح التعليم تونس',
    ] : [
      'référentiel national Tunisie',
      'système éducatif tunisien',
      'programme officiel Ministère Éducation Tunisie',
      'JORT 2019-1085',
      'classes 7ème 8ème 9ème Tunisie',
      'sections baccalauréat Tunisie',
      'baccalauréat tunisien',
      'réforme éducative Tunisie',
    ],
    alternates: { canonical: `${SITE_URL}/referentiel-national` },
    openGraph: {
      title: isAr
        ? 'المرجع الوطني للمنظومة التربوية التونسية'
        : 'Référentiel National du Système Éducatif Tunisien',
      description: isAr
        ? 'المرجع الوطني الرسمي للمنظومة التربوية التونسية.'
        : 'Référentiel national officiel du système éducatif tunisien.',
      url: `${SITE_URL}/referentiel-national`,
      siteName: 'Examanet',
      locale: isAr ? 'ar_TN' : 'fr_TN',
      type: 'website',
    },
  };
}

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
