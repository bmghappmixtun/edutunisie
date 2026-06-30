/**
 * JSON-LD structured data helpers for SEO.
 * All helpers return plain objects ready to be JSON-stringified and embedded
 * via <script type="application/ld+json"> in a page or layout.
 *
 * See: https://schema.org for type definitions
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
const SITE_NAME = 'Examanet';
const SITE_DESCRIPTION =
  'Cours, devoirs, séries, révisions, sujets bac et corrigés — 100% gratuits pour les élèves du Primaire, Collège et Lycée en Tunisie.';

export type BreadcrumbItem = {
  name: string;
  url: string;
};

/**
 * Organization + WebSite + SearchAction — embed in root layout.
 * Enables Google's knowledge panel, sitelinks searchbox, and rich SERP display.
 */
export function organizationSchema() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: SITE_NAME,
      alternateName: 'Examanet Tunisie',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo-transparent.png`,
        width: 269,
        height: 73,
      },
      description: SITE_DESCRIPTION,
      foundingDate: '2026',
      areaServed: {
        '@type': 'Country',
        name: 'Tunisia',
      },
      inLanguage: ['fr', 'ar'],
      sameAs: [
        // Add social links when available — currently empty
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: ['fr', 'ar'],
      publisher: { '@id': `${SITE_URL}#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/recherche?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ];
}

/**
 * BreadcrumbList — for the visual breadcrumb in SERPs.
 * Pass items in order from root to current page.
 */
export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Person schema for a teacher profile page.
 */
export function personSchema(opts: {
  id: string;
  name: string;
  description?: string | null;
  url: string;
  schoolName?: string | null;
  schoolNameAr?: string | null;
  resourceCount?: number;
  subjects?: string[];
}) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': opts.id,
    name: opts.name,
    url: opts.url,
    worksFor: opts.schoolName
      ? { '@type': 'EducationalOrganization', name: opts.schoolName }
      : { '@type': 'EducationalOrganization', name: 'Examanet', url: SITE_URL },
    affiliation: { '@id': `${SITE_URL}#organization` },
  };
  if (opts.description) data.description = opts.description;
  if (opts.resourceCount && opts.subjects?.length) {
    data.knowsAbout = opts.subjects;
    data.alumniOf = undefined;
  }
  return data;
}

/**
 * Course schema — for resource pages (extends LearningResource).
 * Adds educational specifics like syllabus, courseMode, etc.
 */
export function courseSchema(opts: {
  slug: string;
  title: string;
  description: string;
  language: string;
  level: string; // "9ème année de base" or "2ème année secondaire"
  cycle: string; // "Enseignement de base" or "Enseignement Secondaire"
  subject: string;
  type: string; // COURSE / HOMEWORK / EXERCISE / etc.
  year?: string | null;
  teacher?: string | null;
  url: string;
  datePublished: string;
  dateModified: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: opts.title,
    description: opts.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500),
    url: opts.url,
    inLanguage: opts.language,
    educationalLevel: opts.level,
    educationalCredentialAwarded: undefined,
    isAccessibleForFree: true,
    provider: { '@id': `${SITE_URL}#organization` },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: 'PT1H',
      inLanguage: opts.language,
      instructor: opts.teacher
        ? { '@type': 'Person', name: opts.teacher }
        : undefined,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'TND',
        availability: 'https://schema.org/InStock',
      },
    },
    about: opts.subject,
    keywords: [opts.subject, opts.level, opts.cycle, opts.type, 'Tunisie', 'examanet']
      .filter(Boolean)
      .join(', '),
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
    isPartOf: { '@id': `${SITE_URL}#website` },
  };
}

/**
 * ItemList schema — for /niveaux, /matieres, /professeurs, /ressources pages.
 */
export function itemListSchema(opts: {
  name: string;
  description?: string;
  url: string;
  items: Array<{ name: string; url: string; description?: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    numberOfItems: opts.items.length,
    itemListElement: opts.items.slice(0, 50).map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
      description: item.description,
    })),
  };
}

/**
 * FAQPage schema — for /faq page.
 */
export function faqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export { SITE_URL, SITE_NAME, SITE_DESCRIPTION };