import type { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';
import {
  courseSchema,
  faqSchema,
  breadcrumbSchema,
  itemListSchema,
  SITE_URL,
} from '@/lib/structured-data';
import { Link } from '@/i18n/navigation';
import { ChevronRight, Library, BookOpen, Calculator, Atom, Leaf, Globe, BookText, Brain, Laptop, Heart, TrendingUp, Briefcase } from 'lucide-react';
import ProgrammeOfficielClient from '@/components/programme-officiel/ProgrammeOfficielClient';
import { getTranslations as getT } from 'next-intl/server';

export const revalidate = 3600; // ISR: refresh hourly

const PAGE_URL = `${SITE_URL}/programme-officiel`;

// ============================================================================
// METADATA
// ============================================================================
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isAr = locale === 'ar';

  const title = isAr
    ? 'البرنامج التعليمي التونسي 2025-2026 | وزارة التربية'
    : 'Programme Éducatif Tunisien 2025-2026 | Ministère de l\'Éducation';
  const description = isAr
    ? '📚 البرنامج التعليمي التونسي الرسمي 2025-2026 — جميع المواد للمرحلة الإعدادية (السنة 7-9) والثانوية (1AS-4AS). محتوى حسب القسم: 7 شعب، 13 مادة، 4 محاور للبكالوريا. مصادر: edunet.tn، cnp.com.tn، bac.com.tn.'
    : '📚 Programme éducatif officiel tunisien 2025-2026 — Toutes les matières du collège (7-9ème) et du lycée (1AS-4AS). Contenu par section : 7 sections BAC, 13 matières, 4 thèmes par matière BAC. Sources : edunet.tn, cnp.com.tn, bac.com.tn.';

  return {
    title,
    description,
    keywords: isAr
      ? [
          'البرنامج التعليمي التونسي',
          'منهج وزارة التربية',
          'برنامج الإعدادي',
          'برنامج الثانوي',
          'مناهج تونس',
          'مواد الإعدادي',
          'مواد الثانوي',
          'برنامج الباكالوريا',
          'شعبة الرياضيات',
          'شعبة العلوم التجريبية',
          'شعبة العلوم التقنية',
          'شعبة علوم الإعلامية',
          'شعبة الاقتصاد والتصرف',
          'شعبة الآداب',
          'شعبة الرياضة',
          'الثلاثي الأول',
          'الثلاثي الثاني',
          'الثلاثي الثالث',
          'examanet',
          'edunet',
          'مناهج وزارة التربية التونسية',
        ]
      : [
          'programme éducatif tunisien',
          'programme officiel tunisie',
          'programme collège tunisien',
          'programme lycée tunisien',
          'programme bac tunisien',
          'matières collège',
          'matières lycée',
          'sections bac tunisien',
          'mathématiques programme tunisie',
          'physique programme tunisie',
          'svt programme tunisie',
          'programme officiel',
          'ministère éducation tunisien',
          'edunet',
          'cnp',
          'bac.com.tn',
          'examanet',
        ],
    alternates: {
      canonical: PAGE_URL,
      languages: {
        fr: PAGE_URL,
        ar: `${SITE_URL}/ar/programme-officiel`,
        'x-default': PAGE_URL,
      },
    },
    openGraph: {
      title,
      description,
      url: PAGE_URL,
      siteName: 'Examanet',
      locale: isAr ? 'ar_TN' : 'fr_TN',
      type: 'website',
      images: [
        {
          url: '/api/og/page/programme-officiel',
          width: 1200,
          height: 630,
          alt: isAr ? 'البرنامج التعليمي التونسي' : 'Programme Éducatif Tunisien',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/api/og/page/programme-officiel'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
    },
  };
}

// ============================================================================
// PAGE
// ============================================================================
export default async function ProgrammeOfficielPage() {
  const t = await getT();
  const locale = await getLocale();
  const isAr = locale === 'ar';

  // Structured data
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: 'Accueil', url: SITE_URL },
    { name: 'Programme Officiel', url: PAGE_URL },
  ]);

  const courseJsonLd = courseSchema({
    slug: 'programme-officiel-tunisien-2025-2026',
    title: isAr ? 'البرنامج التعليمي التونسي 2025-2026' : 'Programme Éducatif Tunisien 2025-2026',
    description: isAr
      ? 'البرنامج التعليمي الرسمي لوزارة التربية التونسية لجميع المستويات'
      : 'Programme éducatif officiel du Ministère de l\'Éducation tunisien pour tous les niveaux',
    language: isAr ? 'ar-TN' : 'fr-TN',
    level: isAr ? 'الإعدادي والثانوي' : 'Collège et Lycée',
    cycle: isAr ? 'التعليم الأساسي والثانوي' : 'Enseignement de base et secondaire',
    subject: isAr ? 'جميع المواد' : 'Toutes les matières',
    type: 'Curriculum',
    url: PAGE_URL,
    datePublished: '2024-09-01',
    dateModified: new Date().toISOString(),
  });

  const faqJsonLd = faqSchema([
    {
      question: isAr ? 'ما هو البرنامج التعليمي التونسي الرسمي؟' : 'Quel est le programme éducatif officiel tunisien ?',
      answer: isAr
        ? 'البرنامج التعليمي التونسي هو المنهج الرسمي لوزارة التربية التونسية لجميع المستويات: الإعدادي (7-9) والثانوي (1AS-4AS). متاح على edunet.tn وcnp.com.tn.'
        : 'Le programme éducatif tunisien est le curriculum officiel du Ministère de l\'Éducation tunisien pour tous les niveaux : collège (7-9ème) et lycée (1AS-4AS). Disponible sur edunet.tn et cnp.com.tn.',
    },
    {
      question: isAr ? 'كم عدد شعب الباكالوريا التونسية؟' : 'Combien de sections compte le Baccalauréat tunisien ?',
      answer: isAr
        ? 'الباكالوريا التونسية تحتوي على 7 شعب: الرياضيات، العلوم التجريبية، العلوم التقنية، علوم الإعلامية، الاقتصاد والتصرف، الآداب، الرياضة.'
        : 'Le Baccalauréat tunisien compte 7 sections : Mathématiques, Sciences Expérimentales, Sciences Techniques, Sciences de l\'Informatique, Économie-Gestion, Lettres, Sport.',
    },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd, courseJsonLd, faqJsonLd]) }}
      />
      <ProgrammeOfficielClient />
    </>
  );
}
