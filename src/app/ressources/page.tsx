import type { Metadata } from 'next';
import { Prisma } from '@prisma/client';
import Header from '@/components/layout/Header';
import { getLocale } from '@/lib/i18n-server';
import Footer from '@/components/layout/Footer';
import { prisma } from '@/lib/prisma';
import { getUserFavorites } from '@/lib/resource-helpers';
import { itemListSchema } from '@/lib/structured-data';
import FilterShell from '@/components/ressources/FilterShell';
import type { Facets } from '@/lib/facets';
import { getCurrentUser } from '@/lib/auth';

export async function generateMetadata(): Promise<Metadata> {
  const locale = getLocale();
  const isAr = locale === 'ar';
  const totalResources = await prisma.resource.count({ where: { status: 'PUBLISHED' } });
  return {
    title: isAr
      ? 'جميع الموارد التربوية'
      : 'Toutes les ressources pédagogiques',
    description: isAr
      ? `اكتشف أكثر من ${totalResources.toLocaleString('ar-TN')} مورد: دروس، فروض، تمارين، سلاسل، ملخصات، مواضيع باك وإصلاحات. مرشحات حسب المادة، القسم، الشعبة، السنة، الثلاثي.`
      : 'Explorez plus de 15 000 ressources : cours, devoirs, exercices, séries, résumés, sujets de bac et corrigés. Filtres par matière, classe, section, année et trimestre.',
    alternates: { canonical: '/ressources' },
    openGraph: {
      title: isAr
        ? 'جميع الموارد — إكسامانت'
        : 'Toutes les ressources — Examanet',
      description: isAr
        ? `${totalResources.toLocaleString('ar-TN')} درس, تمرين, موضوع باك وإصلاح للبرنامج التونسي.`
        : '15 000+ cours, exercices, sujets de bac et corrigés pour le programme tunisien.',
      url: '/ressources',
      type: 'website',
      locale: isAr ? 'ar_TN' : 'fr_TN',
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-snippet': -1 } },
  };
}

export const dynamic = 'force-dynamic'; // dynamic because of searchParams

interface SearchParams {
  q?: string;
  type?: string | string[];
  class?: string | string[];
  section?: string | string[];
  subject?: string | string[];
  trimestre?: string | string[];
  year?: string | string[];
  language?: string | string[];
  hasCorrection?: string;
  teacherId?: string;
  sort?: string;
  page?: string;
  view?: string;
}

const toArr = (v: string | string[] | undefined): string[] => {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
};

export default async function ResourcesPage(props: { searchParams: Promise<SearchParams> }) {
  const sp = await props.searchParams;

  // ============== Parse URL state ==============
  const q = sp.q || '';
  const type = toArr(sp.type);
  const classSlug = toArr(sp.class);
  const section = toArr(sp.section);
  const subject = toArr(sp.subject);
  const trimestre = toArr(sp.trimestre);
  const year = toArr(sp.year);
  const language = toArr(sp.language);
  const hasCorrection = sp.hasCorrection === '1';
  const teacherNumericId = sp.teacherId ? parseInt(sp.teacherId, 10) : null;
  const sort = sp.sort || 'recent';
  const page = Math.max(1, parseInt(sp.page || '1'));

  // ============== Build where clause ==============
  const where: Prisma.ResourceWhereInput = { status: 'PUBLISHED' };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { summary: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (type.length > 0) where.type = { in: type };
  if (classSlug.length > 0) where.class = { slug: { in: classSlug } };
  if (section.length > 0) where.section = { slug: { in: section } };
  if (subject.length > 0) where.subject = { slug: { in: subject } };
  if (trimestre.length > 0) where.trimester = { in: trimestre };
  if (year.length > 0) where.year = { in: year };
  if (language.length > 0) where.language = { in: language };
  if (hasCorrection) where.hasCorrection = true;
  if (teacherNumericId) {
    // Look up teacher cuid by numericId
    const teacher = await prisma.user.findUnique({
      where: { numericId: teacherNumericId },
      select: { id: true },
    });
    if (teacher) where.teacherId = teacher.id;
  }

  const orderBy: Prisma.ResourceOrderByWithRelationInput =
    sort === 'popular' ? { viewsCount: 'desc' }
    : sort === 'downloads' ? { downloadsCount: 'desc' }
    : sort === 'rating' ? { ratingCount: 'desc' }
    : sort === 'oldest' ? { publishedAt: 'asc' }
    : { publishedAt: 'desc' };

  // ============== Build base where for facets (excludes search OR) ==============
  const facetBase: Prisma.ResourceWhereInput = { status: 'PUBLISHED' };
  if (type.length > 0) facetBase.type = { in: type };
  if (classSlug.length > 0) facetBase.class = { slug: { in: classSlug } };
  if (section.length > 0) facetBase.section = { slug: { in: section } };
  if (subject.length > 0) facetBase.subject = { slug: { in: subject } };
  if (trimestre.length > 0) facetBase.trimester = { in: trimestre };
  if (year.length > 0) facetBase.year = { in: year };
  if (language.length > 0) facetBase.language = { in: language };
  if (hasCorrection) facetBase.hasCorrection = true;
  if (teacherNumericId) {
    const teacher = await prisma.user.findUnique({
      where: { numericId: teacherNumericId },
      select: { id: true },
    });
    if (teacher) facetBase.teacherId = teacher.id;
  }

  // ============== Run all queries in parallel ==============
  const PAGE_SIZE = 24;
  const [
    resources,
    total,
    byType,
    byTrimestre,
    byYear,
    byLanguage,
    withCorrectionCount,
    currentUser,
  ] = await Promise.all([
    prisma.resource.findMany({
      where,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      orderBy,
      include: {
        subject: { select: { slug: true, nameFr: true, color: true } },
        class: { select: { slug: true, nameFr: true } },
        section: { select: { slug: true, nameFr: true } },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
            avatarUrl: true,
            schoolName: true,
          },
        },
        _count: { select: { comments: true, ratings: true, favorites: true } },
      },
    }),
    prisma.resource.count({ where }),
    prisma.resource.groupBy({
      by: ['type'],
      where,
      _count: { _all: true },
    }),
    prisma.resource.groupBy({
      by: ['trimester'],
      where: { ...where, trimester: { not: null } },
      _count: { _all: true },
    }),
    prisma.resource.groupBy({
      by: ['year'],
      where: { ...where, year: { not: null } },
      _count: { _all: true },
      orderBy: { year: 'desc' },
    }),
    prisma.resource.groupBy({
      by: ['language'],
      where,
      _count: { _all: true },
    }),
    prisma.resource.count({ where: { ...where, hasCorrection: true } }),
    getCurrentUser(),
  ]);

  // Fetch class/section/subject IDs separately (groupBy on nullable strings has TS issues)
  const [classRecords, sectionRecords, subjectRecords] = await Promise.all([
    prisma.resource.findMany({
      where: facetBase,
      select: { classId: true },
    }),
    prisma.resource.findMany({
      where: facetBase,
      select: { sectionId: true },
    }),
    prisma.resource.findMany({
      where: facetBase,
      select: { subjectId: true },
    }),
  ]);

  // Group manually
  const classGroups = Object.entries(
    classRecords.reduce((acc, r) => {
      if (r.classId) acc[r.classId] = (acc[r.classId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([classId, count]) => ({ classId, _count: { _all: count } }));

  const sectionGroups = Object.entries(
    sectionRecords.reduce((acc, r) => {
      if (r.sectionId) acc[r.sectionId] = (acc[r.sectionId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([sectionId, count]) => ({ sectionId, _count: { _all: count } }));

  const subjectGroups = Object.entries(
    subjectRecords.reduce((acc, r) => {
      if (r.subjectId) acc[r.subjectId] = (acc[r.subjectId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([subjectId, count]) => ({ subjectId, _count: { _all: count } }));

  // Resolve class/section/subject names
  const classIds = classGroups.map((g) => g.classId).filter((id): id is string => !!id);
  const sectionIds = sectionGroups.map((g) => g.sectionId).filter((id): id is string => !!id);
  const subjectIds = subjectGroups.map((g) => g.subjectId).filter((id): id is string => !!id);

  const [classes, sections, subjects, allClasses, allSections, allSubjects] = await Promise.all([
    classIds.length > 0
      ? prisma.class.findMany({
          where: { id: { in: classIds } },
          select: { id: true, slug: true, nameFr: true },
        })
      : Promise.resolve([] as Array<{ id: string; slug: string; nameFr: string }>),
    sectionIds.length > 0
      ? prisma.section.findMany({
          where: { id: { in: sectionIds } },
          select: { id: true, slug: true, nameFr: true },
        })
      : Promise.resolve([] as Array<{ id: string; slug: string; nameFr: string }>),
    subjectIds.length > 0
      ? prisma.subject.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, slug: true, nameFr: true, color: true },
        })
      : Promise.resolve([] as Array<{ id: string; slug: string; nameFr: string; color: string | null }>),
    // Always load ALL classes/sections/subjects for the display name maps
    // (used to display 'Sciences' instead of 'sciences' in the filter)
    prisma.class.findMany({ select: { slug: true, nameFr: true } }),
    prisma.section.findMany({ select: { slug: true, nameFr: true } }),
    prisma.subject.findMany({ select: { slug: true, nameFr: true } }),
  ]);

  // ============== Build facets ==============
  const byClassMap: Record<string, number> = {};
  classGroups.forEach((g) => {
    const c = classes.find((x) => x.id === g.classId);
    if (c && g._count && typeof g._count === 'object') byClassMap[c.slug] = g._count._all;
  });

  const bySectionMap: Record<string, number> = {};
  sectionGroups.forEach((g) => {
    const s = sections.find((x) => x.id === g.sectionId);
    if (s && g._count && typeof g._count === 'object') bySectionMap[s.slug] = g._count._all;
  });

  const bySubjectMap: Record<string, number> = {};
  subjectGroups.forEach((g) => {
    const s = subjects.find((x) => x.id === g.subjectId);
    if (s && g._count && typeof g._count === 'object') bySubjectMap[s.slug] = g._count._all;
  });

  const facets: Facets = {
    byType: Object.fromEntries(
      byType
        .filter((b) => b.type && b._count && typeof b._count === 'object')
        .map((b) => [b.type, b._count!._all])
    ),
    byTrimestre: Object.fromEntries(
      byTrimestre
        .filter((b) => b.trimester && b._count && typeof b._count === 'object')
        .map((b) => [b.trimester!, b._count!._all])
    ),
    byYear: Object.fromEntries(
      byYear
        .filter((b) => b.year && b._count && typeof b._count === 'object')
        .map((b) => [b.year!, b._count!._all])
    ),
    byLanguage: Object.fromEntries(
      byLanguage
        .filter((b) => b.language && b._count && typeof b._count === 'object')
        .map((b) => [b.language!, b._count!._all])
    ),
    byClass: byClassMap,
    bySection: bySectionMap,
    bySubject: bySubjectMap,
    withCorrection: withCorrectionCount,
  };

  // ============== Favorites (if logged) ==============
  const favoriteIds = currentUser
    ? await getUserFavorites(resources.map((r) => r.id))
    : new Set<string>();

  // ============== JSON-LD ==============
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
  const jsonLd = resources.length > 0
    ? itemListSchema({
        name: 'Toutes les ressources pédagogiques — Examanet',
        description: `Catalogue de ${total.toLocaleString('fr-FR')} ressources pédagogiques gratuites du système éducatif tunisien.`,
        url: `${baseUrl}/ressources`,
        items: resources.slice(0, 50).map((r) => ({
          name: r.title,
          url: `${baseUrl}/ressources/${r.numericId}/${r.slug}`,
          description: r.description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) || undefined,
        })),
      })
    : null;

  // ============== Page header text ==============
  let pageTitle = 'Toutes les ressources';
  let pageSubtitle = `${total.toLocaleString('fr-FR')} ressources gratuites pour le système éducatif tunisien.`;
  if (q) {
    pageTitle = `Résultats pour « ${q} »`;
    pageSubtitle = `${total.toLocaleString('fr-FR')} résultats correspondants.`;
  } else if (teacherNumericId && currentUser) {
    pageTitle = `Ressources de l'enseignant`;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Header />

      <main className="flex-1 pt-24 lg:pt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-3xl lg:text-4xl font-extrabold mb-2 leading-tight text-slate-900">
              {pageTitle}
            </h1>
            <p className="text-slate-600 text-sm lg:text-base">
              {pageSubtitle}
            </p>
          </div>

          {/* FilterShell (client) */}
          <FilterShell
            initialData={{
              resources,
              total,
              totalPages: Math.ceil(total / PAGE_SIZE),
              currentPage: page,
              facets,
              nameMaps: {
                class: Object.fromEntries(allClasses.map(c => [c.slug, c.nameFr])),
                section: Object.fromEntries(allSections.map(s => [s.slug, s.nameFr])),
                subject: Object.fromEntries(allSubjects.map(s => [s.slug, s.nameFr])),
              },
            }}
            userId={currentUser?.id ?? null}
            initialFavorites={favoriteIds}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}

function FilterShellSkeleton() {
  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-6">
      <div className="bg-white rounded-2xl border border-slate-200 h-[600px] animate-pulse" />
      <div className="space-y-3">
        <div className="h-14 bg-white rounded-xl border border-slate-200 animate-pulse" />
        <div className="grid grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
