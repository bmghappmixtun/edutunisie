// @ts-nocheck
import type { Metadata } from 'next';
import { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { getUserFavorites } from '@/lib/resource-helpers';
import { itemListSchema } from '@/lib/structured-data';
import { getLevelClassIds } from '@/lib/level-cache';
import { getNameMapsCached } from '@/lib/name-maps-cache';
// 2026-08-07 nightly fix: import FilterShell directly instead of via
// `next/dynamic({ ssr: true })`. The dynamic wrapper placed the component
// in its own Suspense boundary, which caused the streamed HTML to contain
// both the loading.tsx fallback AND the real FilterShell content side by
// side — when the browser's React runtime replaced the fallback with the
// streamed content, the resulting DOM no longer matched the loading
// skeleton, triggering React #418/#422 hydration mismatches
// (ERR-Q82BHG 5× and ERR-XBCTZD 5× in 2026-08-07 nightly digest).
// Direct import keeps the FilterShell in the main page render so the
// SSR'd HTML is the single source of truth for hydration.
import FilterShell from '@/components/ressources/FilterShell';

import type { Facets } from '@/lib/facets';
import { getCurrentUser } from '@/lib/auth';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const isAr = locale === 'ar';
  const sp = await searchParams;
  const teacherNumericId = sp.teacherId ? parseInt(sp.teacherId, 10) : null;

  // Look up teacher for personalized title
  let teacherName: string | null = null;
  if (teacherNumericId && !Number.isNaN(teacherNumericId)) {
    const t = await prisma.user.findUnique({
      where: { numericId: teacherNumericId },
      select: { firstName: true, lastName: true },
    });
    if (t) teacherName = `${t.firstName || ''} ${t.lastName || ''}`.trim() || null;
  }

  const totalResources = await prisma.resource.count({ where: { status: 'PUBLISHED' } });
  const baseTitle = isAr ? 'جميع الموارد التربوية' : 'Toutes les ressources pédagogiques';
  const title = teacherName
    ? isAr
      ? `موارد ${teacherName}`
      : `Ressources de ${teacherName}`
    : baseTitle;
  const description = teacherName
    ? isAr
      ? `جميع موارد ${teacherName} على إكسامانت: دروس، فروض، تمارين، سلاسل.`
      : `Découvrez toutes les ressources partagées par ${teacherName} sur Examanet : cours, devoirs, exercices, séries et corrigés.`
    : isAr
      ? `اكتشف أكثر من ${totalResources.toLocaleString('ar-TN')} مورد: دروس، فروض، تمارين، سلاسل، ملخصات، مواضيع باك وإصلاحات.`
      : 'Explorez plus de 15 000 ressources : cours, devoirs, exercices, séries, résumés, sujets de bac et corrigés.';

  return {
    title,
    description,
    alternates: {
      canonical: teacherNumericId ? `/ressources?teacherId=${teacherNumericId}` : '/ressources',
      languages: {
        'fr-TN': teacherNumericId ? `/ressources?teacherId=${teacherNumericId}` : '/ressources',
        'ar-TN': teacherNumericId ? `/ar/ressources?teacherId=${teacherNumericId}` : '/ar/ressources',
        'x-default': teacherNumericId ? `/ressources?teacherId=${teacherNumericId}` : '/ressources',
      },
    },
    openGraph: {
      title: isAr ? 'جميع الموارد — إكسامانت' : 'Toutes les ressources — Examanet',
      description: isAr
        ? `${totalResources.toLocaleString('ar-TN')} درس, تمرين, موضوع باك وإصلاح للبرنامج التونسي.`
        : '15 000+ cours, exercices, sujets de bac et corrigés pour le programme tunisien.',
      url: '/ressources',
      type: 'website',
      locale: isAr ? 'ar_TN' : 'fr_TN',
      images: [`${process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com'}/api/og/page/ressources`],
    },
    twitter: {
      card: 'summary_large_image',
      title: isAr ? 'جميع الموارد — إكسامانت' : 'Toutes les ressources — Examanet',
      description: isAr
        ? `${totalResources.toLocaleString('ar-TN')} درس, تمرين, موضوع باك وإصلاح للبرنامج التونسي.`
        : '15 000+ cours, exercices, sujets de bac et corrigés pour le programme tunisien.',
      images: [`${process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com'}/api/og/page/ressources`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-snippet': -1 },
    },
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
  collegePilote?: string;
  collegeOrdinaire?: string;
  lyceePilote?: string;
  lyceeOrdinaire?: string;
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
  // ============== MIN LOADING TIME (UX) ==============
  // Force the loading state to be visible for at least 600ms. This prevents
  // the loading skeleton from flashing so fast that users don't see it.
  // Minimal artificial delay — used so the loading.tsx skeleton is visible
  // for at least a brief moment (avoids layout flash). Reduced from 600ms →
  // 150ms in 2026-08-09 perf pass: the page now loads fast enough that 600ms
  // was just adding perceived latency.
  const MIN_LOADING_MS = 150;
  const minLoadingTimer = new Promise<void>((resolve) => setTimeout(resolve, MIN_LOADING_MS));

  const sp = await props.searchParams;

  // ============== HANDLE LEGACY URLS (migrate from CUID to numericId) ==============
  // Old shared links used ?teacher=CUID. The current code uses ?teacherId=NUMERIC.
  // If we detect the old format, look up the teacher's numericId and redirect
  // to the canonical URL to prevent hydration mismatches.
  const legacyTeacherCuid = (sp as Record<string, string | string[] | undefined>).teacher;
  if (legacyTeacherCuid && !sp.teacherId) {
    const cuid = Array.isArray(legacyTeacherCuid) ? legacyTeacherCuid[0] : legacyTeacherCuid;
    if (cuid && cuid.startsWith('cm')) {
      const t = await prisma.user.findUnique({
        where: { id: cuid },
        select: { numericId: true },
      });
      if (t?.numericId) {
        // Preserve all other params, swap teacher → teacherId
        const newSp = new URLSearchParams();
        for (const [k, v] of Object.entries(sp)) {
          if (k === 'teacher') continue;
          if (Array.isArray(v)) v.forEach((vv) => newSp.append(k, vv));
          else if (v != null) newSp.set(k, v);
        }
        newSp.set('teacherId', String(t.numericId));
        redirect(`/ressources?${newSp.toString()}`);
      }
    }
  }

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
  const collegePilote = sp.collegePilote === '1';
  const collegeOrdinaire = sp.collegeOrdinaire === '1';
  const lyceePilote = sp.lyceePilote === '1';
  const lyceeOrdinaire = sp.lyceeOrdinaire === '1';
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
  // 4 boolean category filters — converted to classId IN + schoolType IN.
  // PERF 2026-08-09: old approach used `where.OR = [...]` with `class.level`
  // joins which forces Postgres to JOIN through Class→Level on every row.
  // New approach: pre-compute classIds by level (4 lycee classes + 9 college
  // classes, never changes at runtime → can be cached). For each active
  // category, intersect the matching classIds with the matching schoolType.
  // Bench: same query goes from ~570ms → ~290ms (2x faster).
  //
  // Note: cache for 5min via Next's fetch cache so first request builds
  // the map, subsequent ones are O(1).
  const levelClassIds = await getLevelClassIds();
  const collegeClassIds = levelClassIds.college;
  const lyceeClassIds = levelClassIds.lycee;

  // Build the active category filter as a classId IN + schoolType IN.
  // Multiple categories of the SAME level merge (OR of classIds),
  // different levels combine via AND.
  const activeLevels: Array<'college' | 'lycee'> = [];
  const wantedSchoolTypes = new Set<string>();
  if (collegePilote) {
    activeLevels.push('college');
    wantedSchoolTypes.add('PILOTE');
  }
  if (collegeOrdinaire) {
    activeLevels.push('college');
    wantedSchoolTypes.add('PUBLIC');
    wantedSchoolTypes.add('LYCEE'); // LYCEE schoolType ≈ lycée ordinaire
  }
  if (lyceePilote) {
    activeLevels.push('lycee');
    wantedSchoolTypes.add('PILOTE');
  }
  if (lyceeOrdinaire) {
    activeLevels.push('lycee');
    wantedSchoolTypes.add('PUBLIC');
    wantedSchoolTypes.add('LYCEE');
  }

  if (activeLevels.length > 0) {
    // Dedupe levels
    const uniqueLevels = Array.from(new Set(activeLevels));
    const allowedClassIds = uniqueLevels.flatMap((l) => levelClassIds[l]);
    // Build the classId + schoolType clause. If the user only selected
    // one schoolType, use simple equality. If multiple, use IN.
    const schoolTypeList = Array.from(wantedSchoolTypes);
    if (allowedClassIds.length > 0) {
      where.classId = { in: allowedClassIds };
    }
    if (schoolTypeList.length === 1) {
      where.schoolType = schoolTypeList[0];
    } else if (schoolTypeList.length > 1) {
      where.schoolType = { in: schoolTypeList };
    }
  }

  // Look up teacher for filter + title
  let teacherInfo: { firstName: string | null; lastName: string | null; numericId: number } | null =
    null;
  if (teacherNumericId && !Number.isNaN(teacherNumericId)) {
    const teacher = await prisma.user.findUnique({
      where: { numericId: teacherNumericId },
      select: { id: true, firstName: true, lastName: true, numericId: true },
    });
    if (teacher) {
      where.teacherId = teacher.id;
      teacherInfo = {
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        numericId: teacher.numericId!,
      };
    }
  }

  const orderBy: Prisma.ResourceOrderByWithRelationInput =
    sort === 'popular'
      ? { viewsCount: 'desc' }
      : sort === 'downloads'
        ? { downloadsCount: 'desc' }
        : sort === 'rating'
          ? { ratingCount: 'desc' }
          : sort === 'oldest'
            ? { publishedAt: 'asc' }
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
  const facetCategoryConditions: any[] = [];
  if (collegePilote) {
    facetCategoryConditions.push({ class: { level: { slug: 'college' } }, schoolType: 'PILOTE' });
  }
  if (collegeOrdinaire) {
    facetCategoryConditions.push({ class: { level: { slug: 'college' } }, NOT: { schoolType: 'PILOTE' } });
  }
  if (lyceePilote) {
    facetCategoryConditions.push({ class: { level: { slug: 'lycee' } }, schoolType: 'PILOTE' });
  }
  if (lyceeOrdinaire) {
    facetCategoryConditions.push({ class: { level: { slug: 'lycee' } }, NOT: { schoolType: 'PILOTE' } });
  }
  if (facetCategoryConditions.length > 0) {
    facetBase.OR = facetCategoryConditions;
  }
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
    collegePiloteCount,
    collegeOrdinaireCount,
    lyceePiloteCount,
    lyceeOrdinaireCount,
    currentUser,
  ] = await Promise.all([
    prisma.resource.findMany({
      where,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      orderBy,
      select: {
        // Resource scalars (only the ones the UI actually renders)
        id: true,
        slug: true,
        numericId: true,
        title: true,
        description: true,
        summary: true,
        type: true,
        language: true,
        year: true,
        trimester: true,
        publishedAt: true,
        hasCorrection: true,
        schoolType: true,
        viewsCount: true,
        downloadsCount: true,
        avgRating: true,
        ratingCount: true,
        pageCount: true,
        fileSize: true,
        subjectId: true,
        classId: true,
        sectionId: true,
        teacherId: true,
        // _count for the badge display
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
    // PERF 2026-08-09: replace 4 OR-with-class-level counts with classId IN
    // (pre-resolved classIds cached in level-cache.ts). These four counts
    // power the 4 CategorySwitch components in the filter sidebar.
    prisma.resource.count({
      where: { ...where, classId: { in: collegeClassIds }, schoolType: 'PILOTE' },
    }),
    prisma.resource.count({
      where: { ...where, classId: { in: collegeClassIds }, schoolType: { not: 'PILOTE' } },
    }),
    prisma.resource.count({
      where: { ...where, classId: { in: lyceeClassIds }, schoolType: 'PILOTE' },
    }),
    prisma.resource.count({
      where: { ...where, classId: { in: lyceeClassIds }, schoolType: { not: 'PILOTE' } },
    }),
    getCurrentUser(),
  ]);

  // Fetch class/section/subject counts via groupBy (much faster than fetching all rows).
  // NOTE: classId/sectionId are nullable in the schema. Prisma's groupBy
  // rejects `not: null` filters; we instead filter out null groups in JS.
  // subjectId is non-nullable, so no null filter is needed.
  const [classRecords, sectionRecords, subjectRecords] = await Promise.all([
    prisma.resource.groupBy({
      by: ['classId'],
      where: facetBase,
      _count: { _all: true },
    }),
    prisma.resource.groupBy({
      by: ['sectionId'],
      where: facetBase,
      _count: { _all: true },
    }),
    prisma.resource.groupBy({
      by: ['subjectId'],
      where: facetBase,
      _count: { _all: true },
    }),
  ]);

  // groupBy already returns grouped counts — no manual aggregation needed
  const classGroups = classRecords
    .filter((r: any) => r.classId != null)
    .map((r: any) => ({ classId: r.classId, _count: { _all: r._count?._all ?? 0 } }));

  const sectionGroups = sectionRecords
    .filter((r: any) => r.sectionId != null)
    .map((r: any) => ({ sectionId: r.sectionId, _count: { _all: r._count?._all ?? 0 } }));

  const subjectGroups = subjectRecords
    .filter((r: any) => r.subjectId != null)
    .map((r: any) => ({ subjectId: r.subjectId, _count: { _all: r._count?._all ?? 0 } }));

  // Resolve class/section/subject names
  const classIds = classGroups.map((g) => g.classId).filter((id): id is string => !!id);
  const sectionIds = sectionGroups.map((g) => g.sectionId).filter((id): id is string => !!id);
  const subjectIds = subjectGroups.map((g) => g.subjectId).filter((id): id is string => !!id);

  // PERF 2026-08-09: previously this block did 6 queries in parallel
  // (3× for facet resolution + 3× for the always-loaded name maps).
  // We've since moved the name-map lookups to a 5min module cache
  // (see `getNameMapsCached`) so the 3 always-load queries become
  // near-instant cache reads, freeing up the network round-trip budget
  // for the resource-relation hydrations below.
  const rIds = resources.map((r) => r.subjectId);
  const cIds = resources.map((r) => r.classId).filter((id): id is string => !!id);
  const sIds = resources.map((r) => r.sectionId).filter((id): id is string => !!id);
  const tIds = resources.map((r) => r.teacherId).filter((id): id is string => !!id);

  const [
    classes,
    sections,
    subjects,
    nameMaps,
    subjList,
    classList,
    sectionList,
    teacherList,
  ] = await Promise.all([
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
      : Promise.resolve(
          [] as Array<{ id: string; slug: string; nameFr: string; color: string | null }>,
        ),
    // Cached: the all-classes/sections/subjects list never changes at runtime
    getNameMapsCached(),
    // Resource relation hydrations (1 query each, all in parallel)
    rIds.length > 0
      ? prisma.subject.findMany({
          where: { id: { in: rIds } },
          select: { id: true, slug: true, nameFr: true, color: true },
        })
      : Promise.resolve(
          [] as Array<{ id: string; slug: string; nameFr: string; color: string | null }>,
        ),
    cIds.length > 0
      ? prisma.class.findMany({
          where: { id: { in: cIds } },
          select: { id: true, slug: true, nameFr: true },
        })
      : Promise.resolve([] as Array<{ id: string; slug: string; nameFr: string }>),
    sIds.length > 0
      ? prisma.section.findMany({
          where: { id: { in: sIds } },
          select: { id: true, slug: true, nameFr: true },
        })
      : Promise.resolve([] as Array<{ id: string; slug: string; nameFr: string }>),
    tIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: tIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
            avatarUrl: true,
            schoolName: true,
          },
        })
      : Promise.resolve(
          [] as Array<{
            id: string;
            firstName: string | null;
            lastName: string | null;
            firstNameAr: string | null;
            lastNameAr: string | null;
            avatarUrl: string | null;
            schoolName: string | null;
          }>,
        ),
  ]);

  const { allClasses, allSections, allSubjects } = nameMaps;

  // Build O(1) lookup maps for resource-relation hydration
  const subjById = new Map(subjList.map((s) => [s.id, s]));
  const classById = new Map(classList.map((c) => [c.id, c]));
  const sectionById = new Map(sectionList.map((s) => [s.id, s]));
  const teacherById = new Map(teacherList.map((t) => [t.id, t]));

  // Attach relations to each resource (replaces the old `include: {...}` N+1)
  const enrichedResources = resources.map((r) => ({
    ...r,
    subject: subjById.get(r.subjectId) || null,
    class: r.classId ? classById.get(r.classId) || null : null,
    section: r.sectionId ? sectionById.get(r.sectionId) || null : null,
    teacher: r.teacherId ? teacherById.get(r.teacherId) || null : null,
  }));
  // Re-assign to keep the same `resources` variable name (rest of page reads it)
  resources.length = 0;
  resources.push(...enrichedResources);

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
        .map((b) => [b.type, b._count!._all]),
    ),
    byTrimestre: Object.fromEntries(
      byTrimestre
        .filter((b) => b.trimester && b._count && typeof b._count === 'object')
        .map((b) => [b.trimester!, b._count!._all]),
    ),
    byYear: Object.fromEntries(
      byYear
        .filter((b) => b.year && b._count && typeof b._count === 'object')
        .map((b) => [b.year!, b._count!._all]),
    ),
    byLanguage: Object.fromEntries(
      byLanguage
        .filter((b) => b.language && b._count && typeof b._count === 'object')
        .map((b) => [b.language!, b._count!._all]),
    ),
    byClass: byClassMap,
    bySection: bySectionMap,
    bySubject: bySubjectMap,
    withCorrection: withCorrectionCount,
    collegePilote: collegePiloteCount,
    collegeOrdinaire: collegeOrdinaireCount,
    lyceePilote: lyceePiloteCount,
    lyceeOrdinaire: lyceeOrdinaireCount,
  };

  // ============== Favorites (if logged) + min loading time ==============
  // Convert the favorites Set to a plain string[] before passing across the
  // RSC boundary to <FilterShell> (a client component). Sets serialize
  // unreliably across RSC and can deserialise as `{}` on the client, which
  // breaks `favorites.has(r.id)` and triggers React #418 / #422 hydration
  // errors. Arrays are safe to serialize.
  const [favoriteIds] = await Promise.all([
    currentUser
      ? getUserFavorites(resources.map((r) => r.id))
      : Promise.resolve(new Set<string>()),
    minLoadingTimer,  // ensure loading state visible for at least 600ms
  ]);
  const favoriteIdsArray = Array.from(favoriteIds);

  // ============== JSON-LD ==============
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
  const jsonLd =
    resources.length > 0
      ? itemListSchema({
          name: 'Toutes les ressources pédagogiques — Examanet',
          description: `Catalogue de ${total.toLocaleString('fr-FR')} ressources pédagogiques gratuites du système éducatif tunisien.`,
          url: `${baseUrl}/ressources`,
          items: resources.slice(0, 50).map((r) => ({
            name: r.title,
            url: `${baseUrl}/ressources/${r.numericId}/${r.slug}`,
            description:
              r.description
                ?.replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 200) || undefined,
          })),
        })
      : null;

  // ============== Page header text ==============
  let pageTitle = 'Toutes les ressources';
  let pageSubtitle = `${total.toLocaleString('fr-FR')} ressources gratuites pour le système éducatif tunisien.`;
  if (q) {
    pageTitle = `Résultats pour « ${q} »`;
    pageSubtitle = `${total.toLocaleString('fr-FR')} résultats correspondants.`;
  } else if (teacherInfo) {
    const teacherName =
      `${teacherInfo.firstName || ''} ${teacherInfo.lastName || ''}`.trim() || 'cet enseignant';
    pageTitle = `Ressources de ${teacherName}`;
    pageSubtitle = `${total.toLocaleString('fr-FR')} ressources partagées par ${teacherName} sur Examanet.`;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Always render the JSON-LD script (matching loading.tsx placeholder)
          to keep the wrapper child count consistent. React's hydration
          check compares element counts — if jsonLd is null we render an
          empty {} placeholder so the structure is identical to loading. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd ? JSON.stringify(jsonLd) : '{}' }}
      />
      <main className="flex-1 pt-24 lg:pt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page header — element type + child count MUST match loading.tsx
              (h1 + p + progress-bar placeholder) to avoid React #418/#422
              hydration mismatches when the page render fails and the
              loading skeleton remains in the DOM. The placeholder div takes
              the same height as the loading's progress bar so the layout
              doesn't shift when the streaming content replaces the loading. */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-extrabold mb-3 leading-tight text-slate-900 flex items-center gap-5">
              <span>{pageTitle}</span>
            </h1>
            <p className="text-slate-600 text-sm lg:text-base">{pageSubtitle}</p>
            {/* Placeholder matching the loading.tsx progress bar — same
                height, same vertical margin, no visual impact (transparent
                + no children). Keeps the wrapper's child count at 3
                (h1 + p + progress-bar) so the React tree matches loading. */}
            <div
              className="mt-4 w-72 h-1.5 rounded-full overflow-hidden"
              aria-hidden="true"
            />
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
                class: Object.fromEntries(allClasses.map((c) => [c.slug, c.nameFr])),
                section: Object.fromEntries(allSections.map((s) => [s.slug, s.nameFr])),
                subject: Object.fromEntries(allSubjects.map((s) => [s.slug, s.nameFr])),
              },
            }}
            userId={currentUser?.id ?? null}
            initialFavorites={favoriteIdsArray}
          />
        </div>
      </main>

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
            <div
              key={i}
              className="h-72 bg-white rounded-2xl border border-slate-200 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
