import { notFound, permanentRedirect } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getTechMeta } from '@/lib/techologie-meta';
import ResourceActions from '@/components/resources/ResourceActions';
// PDFViewer is lazy-loaded via LazyPDFViewer (~90 KB gzipped saved on initial
// load). The full react-pdf + pdfjs-dist bundle was the biggest chunk on the
// resource page (2026-07-30 audit). See src/components/resources/LazyPDFViewer.tsx
// for rationale.
import LazyPDFViewer from '@/components/resources/LazyPDFViewer';
import RatingSection from '@/components/resources/RatingSection';
import CommentsSection from '@/components/resources/CommentsSection';
import ResourceInfoPanel from '@/components/resources/ResourceInfoPanel';
import AiDescription from '@/components/resources/AiDescription';
import AiContentSection from '@/components/resources/AiContentSection';
import AiExerciseOverview from '@/components/resources/AiExerciseOverview';
import { getPaletteForSubject } from '@/lib/ai-palettes';
// NOTE: getPaletteForSubject is kept for future use but currently no consumer
// in this file (the "Sujets abordés" section was removed 2026-08-02 since
// "Sujet général" replaced it).
import { formatNumber, RESOURCE_TYPE_LABELS, HOMEWORK_SUBTYPE_LABELS, timeAgo } from '@/lib/utils';
import { isArabic, splitArabicSubject } from '@/lib/text-utils';
import { courseSchema, breadcrumbSchema } from '@/lib/structured-data';

// Tiny helper for the PDF viewer placeholder file-size label.
function humanFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
import {
  Eye,
  Download,
  MessageCircle,
  Star,
  FileText,
  ChevronRight,
  CheckCircle2,
  GraduationCap,
  Wrench,
  Building2,
  Target,
  Sparkles,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id: rawId, slug: rawSlug } = await params;
  // The numericId is the stable identifier; the slug is purely cosmetic / SEO
  const numericId = parseInt(rawId, 10);
  if (isNaN(numericId)) {
    return { title: 'Ressource non trouvée' };
  }
  // Same URL-decode fix as the page (Next.js doesn't auto-decode non-ASCII slugs)
  let slug: string;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    slug = rawSlug;
  }
  const resource = await prisma.resource.findUnique({
    where: { numericId },
    include: { subject: true, class: true, teacher: true, metadata: true, content: true },
  });
  if (!resource) return { title: 'Ressource non trouvée' };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
  // Strip HTML tags from description (AI summaries may contain <strong>/<ul>)
  const stripHtml = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const rawDescription = resource.description ||
    `${resource.title} — Ressource pédagogique gratuite${resource.subject ? ' en ' + resource.subject.nameFr : ''}${resource.class ? ' pour ' + resource.class.nameFr : ''} sur Examanet Tunisie.`;
  const description = stripHtml(rawDescription);
  // The AI-extracted الموضوع العام is one of the strongest long-tail signals
  // for educational queries — surface it in the meta description so it appears
  // in the SERP snippet (Google displays the first ~155 chars).
  const generalSubject = (resource.metadata?.generalSubject || '').trim() || null;
  const seoDescription = generalSubject
    ? `${generalSubject}. ${description}`.slice(0, 160)
    : description.slice(0, 160);

  return {
    title: resource.title,
    description: seoDescription,
    keywords: (() => {
      const tagList = resource.tags
        ? resource.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [];
      const auto = [
        resource.subject?.nameFr,
        resource.class?.nameFr,
        resource.type,
        'Tunisie',
        'examanet',
      ].filter(Boolean) as string[];
      // The general subject is the most specific topic — put it FIRST in the
      // keyword list so search engines weight it as the primary subject.
      const head = generalSubject ? [generalSubject] : [];
      return Array.from(new Set([...head, ...tagList, ...auto])).slice(0, 15);
    })(),
    alternates: {
      canonical: `${baseUrl}/ressources/${resource.numericId}/${resource.slug}`,
      languages: {
        'fr-TN': `${baseUrl}/ressources/${resource.numericId}/${resource.slug}`,
        'ar-TN': `${baseUrl}/ar/ressources/${resource.numericId}/${resource.slug}`,
        'x-default': `${baseUrl}/ressources/${resource.numericId}/${resource.slug}`,
      },
    },
    openGraph: {
      title: resource.title,
      description: seoDescription,
      url: `${baseUrl}/ressources/${resource.numericId}/${resource.slug}`,
      siteName: 'Examanet',
      locale: 'fr_TN',
      type: 'article',
      // article:tag = Facebook/LinkedIn tags (helps distribution)
      ...(resource.tags
        ? {
            tags: resource.tags
              .split(',')
              .map((t: string) => t.trim())
              .filter(Boolean),
          }
        : {}),
      images: [
        {
          url: `${baseUrl}/api/og/resource/${resource.numericId}`,
          width: 1200,
          height: 630,
          alt: resource.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: resource.title,
      description: seoDescription,
      images: [`${baseUrl}/api/og/resource/${resource.numericId}`],
    },
  };
}

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id: rawId, slug: rawSlug } = await params;
  // SECURITY/UX: Next.js does NOT auto-decode non-ASCII chars in [slug] params
  // (e.g. Arabic slugs arrive as '%D9%81...' percent-encoded). Decode manually
  // so Prisma can find the resource by its real slug.
  // The numericId is the stable identifier; the slug is purely cosmetic / SEO.
  const numericId = parseInt(rawId, 10);
  if (isNaN(numericId)) notFound();
  let slug: string;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    slug = rawSlug;
  }
  // Handle the 'no-slug' fallback used by search results: redirect to the canonical URL
  if (slug === 'no-slug') {
    // Defer to the resource lookup below to get the real slug, then redirect.
    // We can't redirect here because we don't have the resource yet. The lookup below
    // will use numericId and find the real slug, then we render normally.
  }
  const userSession = await getCurrentUser();
  const resource = await prisma.resource.findUnique({
    where: { numericId },
    include: {
      subject: true,
      class: { include: { level: true } },
      section: true,
      teacher: true,
      ratings: { include: { user: { select: { firstName: true, lastName: true } } } },
      comments: {
        where: { parentId: null },
        include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
      },
      // AI-extracted content (2026-07-20 Mavis pipeline)
      metadata: true,
      aiSummary: true,
      content: true,
    },
  });

  // Aggregate ratings for JSON-LD (avg + count) — only shown if there are ratings
  const ratings = resource?.ratings ?? [];
  const aggregateRating =
    ratings.length > 0
      ? {
          ratingCount: ratings.length,
          ratingValue:
            Math.round((ratings.reduce((s, r) => s + r.stars, 0) / ratings.length) * 10) / 10,
        }
      : null;
  if (!resource) notFound();
  // 301 redirect to canonical slug when the requested slug is outdated
  // (titles get rebuilt periodically; this preserves SEO equity from old links).
  if (slug !== resource.slug) {
    permanentRedirect(`/ressources/${resource.numericId}/${resource.slug}`);
  }
  // PUBLISHED resources are fully public. ARCHIVED ones still load (so users
  // following old links / SEO see a friendly message instead of a 404), but
  // we skip the body (no PDF, no view tracking) below. DRAFT/PENDING/REJECTED
  // stay private — only owner/admin can view.
  if (resource.status !== 'PUBLISHED' && resource.status !== 'ARCHIVED') {
    if (!userSession || (userSession.id !== resource.teacherId && userSession.role !== 'ADMIN')) {
      notFound();
    }
  }

  const isArchived = resource.status === 'ARCHIVED';
  const canViewBody = !isArchived || (userSession && (userSession.id === resource.teacherId || userSession.role === 'ADMIN'));

  // Replace the blob URL with our proxy URL so the file is always served from examanet.com
  // (the user never sees the Vercel Blob URL). Skipped for archived resources
  // because we don't want bots/casual visitors tracking views on dead links.
  if (canViewBody) {
    resource.fileUrl = `/api/resources/${resource.id}/download`;

    // Track view
    await prisma.view.create({ data: { resourceId: resource.id, ipAddress: 'visitor' } });
    await prisma.resource.update({
      where: { id: resource.id },
      data: { viewsCount: { increment: 1 } },
    });
  }

  // Similar resources
  const similar = await prisma.resource.findMany({
    where: { status: 'PUBLISHED', subjectId: resource.subjectId, NOT: { id: resource.id } },
    take: 4,
    orderBy: { viewsCount: 'desc' },
    select: {
      id: true,
      numericId: true,
      slug: true,
      title: true,
      viewsCount: true,
      avgRating: true,
      subject: { select: { nameFr: true, color: true } },
      class: { select: { nameFr: true, slug: true } },
      teacher: {
        select: {
          numericId: true,
          slug: true,
          firstName: true,
          lastName: true,
          firstNameAr: true,
          lastNameAr: true,
          schoolName: true,
          schoolNameAr: true,
        },
      },
    },
  });

  // Star distribution
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: resource.ratings.filter((r) => r.stars === star).length,
  }));
  const maxCount = Math.max(...dist.map((d) => d.count), 1);

  // JSON-LD structured data for SEO (LearningResource schema)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
  const resourceUrl = `${baseUrl}/ressources/${resource.numericId}/${resource.slug}`;
  const courseJsonLd = courseSchema({
    slug: resource.slug,
    title: resource.title,
    description:
      resource.description || `${resource.title} — Ressource pédagogique gratuite sur Examanet`,
    language: resource.language || 'fr',
    level: resource.class?.nameFr || resource.class?.level?.nameFr || 'Enseignement de base',
    cycle:
      (resource.headerData as any)?.cycle ||
      resource.class?.level?.nameFr ||
      'Enseignement de base',
    subject: resource.subject?.nameFr || 'Éducation',
    type: resource.type,
    year: resource.year,
    teacher: resource.teacher
      ? `${resource.teacher.firstName || ''} ${resource.teacher.lastName || ''}`
          .replace(/\s+/g, ' ')
          .trim() || null
      : null,
    teacherAr: resource.teacherNameAr || null,
    url: resourceUrl,
    datePublished: resource.publishedAt?.toISOString() || resource.createdAt?.toISOString(),
    dateModified: resource.updatedAt?.toISOString() || resource.createdAt?.toISOString(),
    aggregateRating,
    tags: resource.tags, // SEO: auto-generated tags boost discoverability
    generalSubject: resource.metadata?.generalSubject || null, // الموضوع العام → JSON-LD teaches + keywords
  });
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: 'Accueil', url: baseUrl },
    { name: 'Ressources', url: `${baseUrl}/ressources` },
    ...(resource.subject
      ? [
          {
            name: resource.subject.nameFr || resource.subject.slug,
            url: `${baseUrl}/matieres/${resource.subject.slug}`,
          },
        ]
      : []),
    ...(resource.class
      ? [
          {
            name: resource.class.nameFr || resource.class.slug,
            url: `${baseUrl}/niveaux/${resource.class.level?.slug}?class=${resource.class.slug}`,
          },
        ]
      : []),
    { name: resource.title || 'Ressource', url: resourceUrl },
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <main className="flex-1 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Visual breadcrumb (matches BreadcrumbList JSON-LD) */}
          <nav
            aria-label="Fil d'Ariane"
            className="flex items-center gap-1 text-xs text-slate-500 mb-4 flex-wrap"
          >
            <Link href="/" className="hover:text-primary-600 transition">
              Accueil
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <Link href="/ressources" className="hover:text-primary-600 transition">
              Ressources
            </Link>
            {resource.subject && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <Link
                  href={`/matieres/${resource.subject.slug}`}
                  className="hover:text-primary-600 transition"
                >
                  {resource.subject.nameFr}
                </Link>
              </>
            )}
            {resource.class && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <Link
                  href={`/niveaux/${resource.class.level?.slug}`}
                  className="hover:text-primary-600 transition"
                >
                  {resource.class.nameFr}
                </Link>
              </>
            )}
          </nav>

          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            {/* MAIN */}
            <div>
              {/* ARCHIVED banner — shown to non-owners when the resource is no longer public */}
              {isArchived && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold text-lg">
                      !
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-amber-900 mb-1">
                        Cette ressource n'est plus disponible
                      </h2>
                      <p className="text-sm text-amber-800">
                        Ce document a été archivé et n'est plus accessible au public.
                        {resource.subject && resource.class && (
                          <>
                            {' '}Vous pouvez explorer d'autres ressources de{' '}
                            <Link
                              href={`/matieres/${resource.subject.slug}/${resource.class.slug}`}
                              className="font-semibold underline hover:text-amber-900"
                            >
                              {resource.subject.nameFr} — {resource.class.nameFr}
                            </Link>
                            .
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PROMINENT correction banner — students search corrected homeworks */}
              {resource.hasCorrection && (
                <div className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white rounded-2xl p-5 mb-4 shadow-lg border-2 border-emerald-400/50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-extrabold text-lg mb-1">
                        ✅ Ce document contient un corrigé
                      </h2>
                      {resource.correctionSummary ? (
                        <p className="text-sm text-emerald-50">{resource.correctionSummary}</p>
                      ) : (
                        <p className="text-sm text-emerald-50">
                          Le corrigé détaillé est intégré à la fin du document. Faites défiler pour
                          le consulter.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:p-8 mb-4">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${RESOURCE_TYPE_LABELS[resource.type]?.color}`}
                  >
                    {RESOURCE_TYPE_LABELS[resource.type]?.fr}
                  </span>
                  {/* Homework subtype badge (only when DEVOIR) */}
                  {resource.type === 'DEVOIR' &&
                    resource.homeworkSubtype &&
                    HOMEWORK_SUBTYPE_LABELS[resource.homeworkSubtype] && (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${HOMEWORK_SUBTYPE_LABELS[resource.homeworkSubtype].color}`}
                      >
                        {HOMEWORK_SUBTYPE_LABELS[resource.homeworkSubtype].fr}
                        {resource.homeworkNumber ? ` N°${resource.homeworkNumber}` : ''}
                      </span>
                    )}
                  {resource.class && (
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                      {resource.class.nameFr}
                    </span>
                  )}
                  {resource.section && (
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                      {resource.section.nameFr}
                    </span>
                  )}
                  <span
                    className="px-3 py-1 text-white rounded-full text-xs font-bold"
                    style={{ background: resource.subject.color || '#0EA5E9' }}
                  >
                    {resource.subject.nameFr}
                  </span>
                  {/* Pilote badge — only shown if PILOTE (never PUBLIC) */}
                  {resource.schoolType === 'PILOTE' && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold inline-flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      Lycée/Collège Pilote
                    </span>
                  )}
                  {/* School name badge — shown when extracted from PDF header */}
                  {resource.schoolName && (
                    <span
                      className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium inline-flex items-center gap-1"
                      dir="rtl"
                    >
                      <Building2 className="w-3 h-3" />
                      {resource.schoolName}
                    </span>
                  )}
                </div>

                {(() => {
                  const { fr, ar } = splitArabicSubject(resource.title);
                  const gs = (resource.metadata?.generalSubject || '').trim();
                  // Per user rule (2026-08-13): the green cadre shows the
                  // AI-extracted system name with the French label "Système
                  // technique", centered. Replaces the Arabic "اسم المنتج".
                  const sys = (resource.metadata?.systemName || '').trim();
                  return (
                    <>
                      <h1
                        className={`text-2xl lg:text-3xl font-extrabold text-slate-900 ${ar ? 'mb-1' : 'mb-3'} leading-tight ${isArabic(fr) ? 'text-right' : 'text-left'}`}
                        dir={isArabic(fr) ? 'rtl' : 'ltr'}
                        lang={isArabic(fr) ? 'ar' : 'fr'}
                      >
                        {fr}
                      </h1>
                      {ar && (
                        <div
                          className="text-lg lg:text-xl font-semibold text-slate-600 mb-3 leading-snug text-right font-arabic-title"
                          dir="rtl"
                          lang="ar"
                        >
                          {ar}
                        </div>
                      )}
                      {/* Green cadre: shows the AI-extracted system name with
                          the French label "Système technique", centered.
                          Falls back to general subject display for backward
                          compatibility (e.g. when systemName is not yet
                          populated). */}
                      {sys ? (
                        <div className="mb-4 flex justify-center">
                          <span className="inline-block px-4 py-2 rounded-lg border-2 border-emerald-400 bg-emerald-50 text-sm font-semibold text-emerald-900 text-center">
                            <span className="text-emerald-700">Système technique : </span>
                            <span className="font-bold">{sys}</span>
                          </span>
                        </div>
                      ) : gs ? (
                        <h2
                          dir="auto"
                          lang={isArabic(gs) ? 'ar' : 'fr'}
                          className={`text-sm lg:text-base font-semibold text-slate-500 ${ar ? 'mb-3' : 'mb-2'} tracking-wide ${isArabic(gs) ? 'text-right font-arabic-title' : 'text-left'}`}
                        >
                          {isArabic(gs) ? 'الموضوع العام: ' : 'Sujet : '}
                          <span className="text-slate-700">{gs}</span>
                        </h2>
                      ) : null}
                    </>
                  );
                })()}
                {resource.description && !resource.aiSummary?.summary && (
                  <AiContentSection
                    title={resource.language === 'ar' ? 'ملخص ذكي' : 'Résumé intelligent'}
                    icon={<Sparkles className="w-4 h-4" />}
                    subjectSlug={resource.subject?.slug}
                    defaultOpen={false}
                    className="mb-4"
                  >
                    <AiDescription
                      hideTitle={true}
                      text={resource.description}
                      source={resource.descriptionSource}
                      language={resource.language}
                      headerData={resource.headerData as any}
                      classNameFr={resource.class?.nameFr}
                      classNameAr={resource.class?.nameAr}
                      generalSubject={resource.metadata?.generalSubject}
                      schoolType={resource.schoolType}
                      hideFields={
                        resource.class?.level?.slug === 'lycee'
                          ? ['Sujet général', 'Enseignant', 'Classe']
                          : null
                      }
                    />
                  </AiContentSection>
                )}

                {/* Dossier technique card REMOVED per user rule (2026-08-13):
                    Deleted for ALL files (not just Technologie). The info
                    was redundant with the meta chips inside the
                    "Aperçu des exercices" card. */}

                                {/* AI-generated summary — render via AiDescription for the structured grid card.
                    The general subject (الموضوع العام) is integrated inside the card
                    as a labeled field with a Tag icon. */}
                {resource.aiSummary?.summary && (() => {
                  const summary = resource.aiSummary.summary;
                  const summaryOriginal = (resource.aiSummary as any)?.summaryOriginal || null;
                  // Per user rule (2026-07-30): for college, hide Type (النوع) and
                  // Niveau (المستوى) from the AI card — they're always the same.
                  const isCollege = resource.class?.level?.slug === 'college';
                  // Per user rule (2026-08-06): for all lycée files (any subject),
                  // hide Sujet général / Enseignant / Classe — these are already
                  // shown in the page header (h1), the right sidebar (Enseignant +
                  // Classe) and the title format "BASE (year) : GeneralSubject",
                  // so the AI card would just be redundant.
                  const isLycee = resource.class?.level?.slug === 'lycee';
                  const hideFields = isLycee
                    ? ['Sujet général', 'Enseignant', 'Classe']
                    : null;
                  // Teacher full name (FR + AR) — prefer the resource.teacherNameAr
                  // (text field, no relation) for AR. Fall back to the User record.
                  // Per user rule: "teacherNameAr est juste une info pour l'utilisateur
                  // du site et les moteurs de recherche" — display/SEO only.
                  const teacherFr = resource.teacher
                    ? `${resource.teacher.firstName || ''} ${resource.teacher.lastName || ''}`
                        .replace(/\s+/g, ' ')
                        .trim() || null
                    : null;
                  const teacherAr = (() => {
                    // 1. Prefer the resource-level teacherNameAr (text, no FK)
                    if (resource.teacherNameAr && resource.teacherNameAr.trim()) {
                      return resource.teacherNameAr.trim();
                    }
                    // 2. Fall back to the User record's firstNameAr + lastNameAr
                    if (resource.teacher) {
                      const v = `${resource.teacher.firstNameAr || ''} ${resource.teacher.lastNameAr || ''}`
                        .replace(/\s+/g, ' ')
                        .trim();
                      return v || null;
                    }
                    return null;
                  })();
                  return (
                    <AiContentSection
                      title={resource.language === 'ar' ? 'ملخص ذكي' : 'Résumé intelligent'}
                      icon={<Sparkles className="w-4 h-4" />}
                      subjectSlug={resource.subject?.slug}
                      defaultOpen={false}
                      className="mb-4"
                    >
                      <AiDescription
                      hideTitle={true}
                        text={summary}
                        secondaryText={summaryOriginal}
                        source={resource.aiSummary.modelUsed || 'gpt-4o-mini-batch-v1'}
                        language={resource.language}
                        headerData={resource.headerData as any}
                        classNameFr={resource.class?.nameFr}
                        classNameAr={resource.class?.nameAr}
                        generalSubject={resource.metadata?.generalSubject}
                        subjectSlug={resource.subject?.slug}
                        systemName={resource.metadata?.systemName}
                        subjectLabelOverride={resource.subject?.slug === 'technologie' ? 'التربية التكنولوجية' : null}
                        isCollege={isCollege}
                        dbSchoolNameFr={resource.schoolName}
                        dbSchoolNameAr={null}
                        dbTeacherNameFr={teacherFr}
                        dbTeacherNameAr={teacherAr}
                        aiSchoolName={resource.metadata?.schoolName ?? null}
                        aiProfNames={resource.metadata?.profNames ?? null}
                        schoolType={resource.schoolType}
                        hideFields={hideFields}
                      />
                    </AiContentSection>
                  );
                })()}

                {/* AI Exercise Overview — Per user rule (2026-08-10):
                    Display the AI-extracted exercise summaries from ResourceMetadata.exerciseInsights
                    (new field, 2026-08-12) OR fallback to keyInsights (legacy physique pipeline).
                    Two display modes:
                    - EXERCISE/DEVOIR: "Exercice N (Type): summary" → badge + summary
                    - COURSE: "Titre: summary" → title + summary, numbered list
                    Hidden for SUMMARY/OTHER types. */}
                {(() => {
                  const meta = resource.metadata as any;
                  // Prefer the new exerciseInsights field; fallback to legacy keyInsights
                  const insights = (meta?.exerciseInsights as string[] | undefined)?.length
                    ? (meta.exerciseInsights as string[])
                    : (meta?.keyInsights as string[] | undefined);
                  if (!insights || insights.length === 0) return null;

                  // For Technologie: extract meta (system name, specialty, dossier)
                  // and pass to the component to display at the top of the card.
                  // For COURS: prefer DB courseSubject (pre-extracted), fall back to title regex,
                  // then generalSubject.
                  const isTechnologie = resource.subject?.slug === 'technologie';
                  const isCourse = resource.type === 'COURSE';
                  const techMeta = isTechnologie
                    ? getTechMeta(
                        resource.title,
                        (resource as any).content?.fullText || null,
                        meta?.systemName || null,
                        {
                          isCourse,
                          // For COURS: prefer the pre-extracted courseSubject from DB
                          courseSubject: isCourse ? (meta as any)?.courseSubject || null : null,
                          generalSubject: (meta as any)?.generalSubject || null,
                        }
                      )
                    : null;

                  return (
                    <AiExerciseOverview
                      keyInsights={insights}
                      subjectSlug={resource.subject?.slug}
                      resourceType={resource.type as 'COURSE' | 'EXERCISE' | 'DEVOIR' | 'SUMMARY' | 'OTHER'}
                      meta={techMeta}
                    />
                  );
                })()}

                {/* AI key points — Per user rule (2026-07-30):
                    - Title: "النقاط الرئيسية" (AR) or "Points clés" (FR)
                    - Display: multi-color rounded bubbles instead of a bullet list
                    - Per-subject palette: rose/fuchsia/teal/amber/violet
                    - Per user rule (2026-08-02): align bubbles RIGHT for AR docs,
                      LEFT for FR docs — based on document language, not keyPoint lang
                    - Per user rule (2026-08-03): PILOTE collège Physique is FR (JORT 2019-063),
                      so its card title stays in French ("Points clés") even if resource.lang === 'ar'
                    - Per user rule (2026-08-06): merge long (keyPoints) + short (shortKeyPoints) KP
                      in alternation, max 10 bubbles total. Short KP = lighter shade
                      but SAME font size/padding as long KP (2026-08-10 update). */}
                {(() => {
                  // Per user rule (2026-08-09): Points clés card MIXES long KP (full
                  // sentences) + short KP (2-3 word concepts) in alternation.
                  // Short KP are now real concepts (not just tags) so they make
                  // sense alongside long KP. Max 10 bubbles total. Short = lighter
                  // shade + smaller font to visually distinguish from long KP.
                  const longKps = resource.metadata?.keyPoints || [];
                  const shortKps = (resource.metadata as any)?.shortKeyPoints || [];
                  if (longKps.length === 0 && shortKps.length === 0) return null;
                  // Alternate: short, long, short, long, ... capped at 10 total
                  const merged: { text: string; isShort: boolean }[] = [];
                  const maxLen = Math.max(longKps.length, shortKps.length);
                  for (let i = 0; i < maxLen && merged.length < 10; i++) {
                    if (i < shortKps.length) merged.push({ text: shortKps[i], isShort: true });
                    if (i < longKps.length && merged.length < 10) merged.push({ text: longKps[i], isShort: false });
                  }
                  // Per user rule (2026-08-02): align RIGHT for AR docs, LEFT for FR docs.
                  const isPilotePhysiqueCollege =
                    resource.schoolType === 'PILOTE' &&
                    resource.subject?.slug === 'physique' &&
                    resource.class &&
                    ['7eme', '8eme', '9eme'].includes(resource.class.slug);
                  const isArDoc = resource.language === 'ar' && !isPilotePhysiqueCollege;
                  const titleAlignRight = isArDoc;
                  const keyPointsTitle = isArDoc ? 'النقاط الرئيسية' : 'Points clés';
                  // Long KP: full color. Short KP: lighter shade. Both same size (2026-08-10).
                  const longPalette = [
                    'bg-rose-100 text-rose-800 border-rose-300',
                    'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
                    'bg-teal-100 text-teal-800 border-teal-300',
                    'bg-amber-100 text-amber-800 border-amber-300',
                    'bg-violet-100 text-violet-800 border-violet-300',
                  ];
                  const shortPalette = [
                    'bg-rose-50 text-rose-700 border-rose-200',
                    'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
                    'bg-teal-50 text-teal-700 border-teal-200',
                    'bg-amber-50 text-amber-700 border-amber-200',
                    'bg-violet-50 text-violet-700 border-violet-200',
                  ];
                  return (
                  <AiContentSection
                    title={keyPointsTitle}
                    icon={<Target className="w-4 h-4" />}
                    variant="default"
                    subjectSlug={resource.subject?.slug}
                    defaultOpen={false}
                    alignRight={titleAlignRight}
                  >
                    <div className={`flex flex-wrap gap-2 ${isArDoc ? 'justify-end' : 'justify-start'}`}>
                      {merged.map((kp, i) => {
                        const kpAr = isArabic(kp.text);
                        const palette = kp.isShort ? shortPalette : longPalette;
                        const colorClass = palette[i % palette.length];
                        const searchQuery = encodeURIComponent(kp.text);
                        const searchHref = `/recherche?q=${searchQuery}`;
                        // Per user rule (2026-08-10): SAME font and size for short + long KP.
                        // Visual distinction is only via the lighter/darker color palette.
                        const sizeClass = 'text-sm px-3 py-1.5';
                        return (
                        <Link
                          key={`${kp.isShort ? 's' : 'l'}-${i}`}
                          href={searchHref}
                          dir={kpAr ? 'rtl' : 'ltr'}
                          lang={kpAr ? 'ar' : 'fr'}
                          className={`inline-block rounded-full font-semibold border font-arabic-title ${kpAr ? 'text-right' : 'text-left'} ${sizeClass} ${colorClass} hover:brightness-110 hover:shadow-sm hover:scale-[1.03] transition-all cursor-pointer`}
                        >
                          {kp.text}
                        </Link>
                        );
                      })}
                    </div>
                  </AiContentSection>
                  );
                })()}

                {/* Tags chips were moved to the sidebar (ResourceInfoPanel,
                    under "Langue") per user rule (2026-08-13). The AI-extracted
                    `metadata.topics` now render as chips in the right sidebar
                    of the "Informations" card, not at the bottom of the KP. */}

                {/* Product (المنتج) — only for technologie + college */}
                {resource.product &&
                  resource.subject?.slug === 'technologie' &&
                  resource.class &&
                  ['7eme', '8eme', '9eme'].includes(resource.class.slug) && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg inline-flex items-center gap-2 text-sm">
                      <Wrench className="w-4 h-4 text-amber-700" />
                      <span className="font-bold text-amber-900">المنتج / Produit :</span>
                      <span className="text-amber-800" dir="rtl">
                        {resource.product}
                      </span>
                    </div>
                  )}

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-slate-100">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-1">
                      <Eye className="w-3.5 h-3.5" /> Vues
                    </div>
                    <div className="font-extrabold text-lg">
                      {formatNumber(resource.viewsCount)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-1">
                      <Download className="w-3.5 h-3.5" /> Téléchargements
                    </div>
                    <div className="font-extrabold text-lg">
                      {formatNumber(resource.downloadsCount)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-1">
                      <Star className="w-3.5 h-3.5" /> Note
                    </div>
                    <div className="font-extrabold text-lg">{resource.avgRating.toFixed(1)}/5</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-1">
                      <MessageCircle className="w-3.5 h-3.5" /> Commentaires
                    </div>
                    <div className="font-extrabold text-lg">{resource.commentsCount}</div>
                  </div>
                </div>

                {canViewBody && (
                <ResourceActions
                  resourceId={resource.id}
                  numericId={resource.numericId}
                  slug={resource.slug}
                  title={resource.title}
                  fileUrl={`/api/resources/${resource.id}/download`}
                  originalFileKey={resource.originalFileKey}
                  originalFileName={resource.originalFileName}
                  originalFormat={resource.originalFormat}
                  isTeacher={userSession?.role === 'TEACHER' || userSession?.role === 'ADMIN'}
                  isOwner={userSession?.id === resource.teacherId}
                />
                )}
              </div>

              {/* Aperçu PDF — hidden for archived resources (non-owners).
                  2026-08-16: removed the "Aperçu du document" header and
                  "Ouvrir en plein écran →" link above the viewer to save
                  vertical space. The fullscreen button is still available
                  in the floating toolbar (bottom-center glass pill), and
                  the viewer itself is self-explanatory. */}
              {canViewBody && (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4">
                <div className="p-0">
                  <LazyPDFViewer
                    url={`/api/resources/${resource.id}/download`}
                    fileName={`${resource.title}.pdf`}
                    pageCount={resource.pageCount ?? null}
                    fileSize={resource.fileSize ? humanFileSize(resource.fileSize) : null}
                  />
                </div>
              </div>
              )}

              {/* Notation — hidden for archived resources (non-owners) */}
              {canViewBody && (
              <RatingSection
                resourceId={resource.id}
                avgRating={resource.avgRating}
                ratingCount={resource.ratingCount}
                distribution={dist}
                maxCount={maxCount}
              />
              )}

              {/* Commentaires — hidden for archived resources (non-owners) */}
              {canViewBody && (
              <CommentsSection
                resourceId={resource.id}
                initialComments={resource.comments.map((c) => ({
                  id: c.id,
                  content: c.content,
                  createdAt: c.createdAt.toISOString(),
                  // Pre-compute the relative-time label on the server so the
                  // client component can render byte-for-byte identical HTML
                  // (timeAgo uses Date.now() — non-deterministic across
                  // SSR/hydration). CommentsSection re-runs timeAgo in
                  // useEffect after mount to tick the label forward.
                  createdAtLabel: timeAgo(c.createdAt),
                  user: c.user,
                }))}
              />
              )}

              {/* Similaires */}
              {similar.length > 0 && (
                <div className="mt-6">
                  <h2 className="font-bold text-xl mb-4">📚 Ressources similaires</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {similar.map((s) => (
                      <Link
                        key={s.id}
                        href={`/ressources/${s.numericId}/${s.slug}`}
                        className="card card-hover p-4 flex gap-3"
                      >
                        <div className="w-16 h-20 bg-slate-100 rounded flex items-center justify-center flex-shrink-0">
                          <FileText className="w-8 h-8 text-slate-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm line-clamp-2 mb-1">{s.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {formatNumber(s.viewsCount)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{' '}
                              {s.avgRating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SIDEBAR */}
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
              {/* Prof */}
              {resource.teacher && (
                <div className="card p-5">
                  <h3 className="font-bold text-sm mb-3 text-slate-500 uppercase">Enseignant</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white font-bold text-lg flex items-center justify-center">
                      {resource.teacher.firstName?.[0]}
                      {resource.teacher.lastName?.[0]}
                    </div>
                    <div>
                      <div className="font-bold">
                        {resource.teacher.firstName} {resource.teacher.lastName}
                      </div>
                      {(resource.teacher.firstNameAr || resource.teacher.lastNameAr) && (
                        <div className="text-sm text-slate-600" dir="rtl" lang="ar">
                          {resource.teacher.firstNameAr} {resource.teacher.lastNameAr}
                        </div>
                      )}
                      {(resource.teacher.schoolName || resource.teacher.schoolNameAr) && (
                        <div className="text-xs text-slate-500 mt-1">
                          {resource.teacher.schoolName}
                          {resource.teacher.schoolNameAr && (
                            <span className="block text-slate-400" dir="rtl" lang="ar">
                              {resource.teacher.schoolNameAr}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {resource.teacher.bio && (
                    <p className="text-sm text-slate-600 line-clamp-3">{resource.teacher.bio}</p>
                  )}
                  <Link
                    href={`/professeurs/${resource.teacher.numericId}/${resource.teacher.slug}`}
                    className="text-sm text-primary-600 font-semibold hover:underline mt-2 inline-block"
                  >
                    Voir le profil →
                  </Link>
                </div>
              )}

              {/* COMPLETE Info Panel — for lycée files we hide the "Classe" row
                  because the AI summary card already shows it AND the title
                  format encodes it ("... - 1AS (year)"). Other info (Type,
                  Matière, Section, Trimestre, Année, Langue) stays. */}
              <ResourceInfoPanel
                resource={resource}
                hideClasse={resource.class?.level?.slug === 'lycee'}
              />
            </aside>
          </div>
        </div>
      </main>
      </div>
  );
}


