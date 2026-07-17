import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { Facets, RessourcesResponse } from '@/lib/facets';

export { type Facets, type RessourcesResponse } from '@/lib/facets';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============== HELPERS ==============
function buildWhere(filters: ParsedFilters, exclude: (keyof ParsedFilters)[] = []): Prisma.ResourceWhereInput {
  const where: Prisma.ResourceWhereInput = { status: 'PUBLISHED' };

  if (!exclude.includes('q') && filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: 'insensitive' } },
      { description: { contains: filters.q, mode: 'insensitive' } },
      { summary: { contains: filters.q, mode: 'insensitive' } },
    ];
  }
  if (!exclude.includes('type') && filters.type.length > 0) {
    where.type = { in: filters.type };
  }
  if (!exclude.includes('class') && filters.class.length > 0) {
    where.class = { slug: { in: filters.class } };
  }
  if (!exclude.includes('section') && filters.section.length > 0) {
    where.section = { slug: { in: filters.section } };
  }
  if (!exclude.includes('subject') && filters.subject.length > 0) {
    where.subject = { slug: { in: filters.subject } };
  }
  if (!exclude.includes('trimestre') && filters.trimestre.length > 0) {
    where.trimester = { in: filters.trimestre };
  }
  if (!exclude.includes('year') && filters.year.length > 0) {
    where.year = { in: filters.year };
  }
  if (!exclude.includes('language') && filters.language.length > 0) {
    where.language = { in: filters.language };
  }
  if (!exclude.includes('hasCorrection') && filters.hasCorrection) {
    where.hasCorrection = true;
  }
  if (!exclude.includes('teacherId') && filters.teacherId) {
    where.teacherId = filters.teacherId;
  }

  return where;
}

interface ParsedFilters {
  q: string;
  type: string[];
  class: string[];
  section: string[];
  subject: string[];
  trimestre: string[];
  year: string[];
  language: string[];
  hasCorrection: boolean;
  teacherId: string;
}

// ============== HANDLER ==============
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Parse filters
  const filters: ParsedFilters = {
    q: searchParams.get('q') || '',
    type: searchParams.getAll('type'),
    class: searchParams.getAll('class'),
    section: searchParams.getAll('section'),
    subject: searchParams.getAll('subject'),
    trimestre: searchParams.getAll('trimestre'),
    year: searchParams.getAll('year'),
    language: searchParams.getAll('language'),
    hasCorrection: searchParams.get('hasCorrection') === '1',
    teacherId: searchParams.get('teacherId') || '',
  };

  const sort = searchParams.get('sort') || 'recent';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = 24;
  const skip = (page - 1) * pageSize;

  const where = buildWhere(filters);

  // Convert teacherId from numericId to cuid (DB stores cuid on Resource.teacherId)
  // Accept both numericId (preferred, stable, exposed in URLs) and cuid (legacy)
  if (where.teacherId) {
    const teacherIdStr = String(where.teacherId);
    let resolvedCuid: string | null = null;
    if (/^\d+$/.test(teacherIdStr)) {
      const t = await prisma.user.findUnique({
        where: { numericId: parseInt(teacherIdStr, 10) },
        select: { id: true },
      });
      resolvedCuid = t?.id ?? null;
      if (!resolvedCuid) {
        // Maybe the input is actually a cuid (legacy URL)
        const t2 = await prisma.user.findUnique({
          where: { id: teacherIdStr },
          select: { id: true },
        });
        resolvedCuid = t2?.id ?? null;
      }
    } else {
      const t = await prisma.user.findUnique({
        where: { id: teacherIdStr },
        select: { id: true },
      });
      resolvedCuid = t?.id ?? null;
    }
    where.teacherId = resolvedCuid ?? '__no_match__';
  }

  // Build base where for facets (excludes search OR to avoid type conflicts)
  const facetBase: Prisma.ResourceWhereInput = { status: 'PUBLISHED' };
  if (filters.type.length > 0) facetBase.type = { in: filters.type };
  if (filters.class.length > 0) facetBase.class = { slug: { in: filters.class } };
  if (filters.section.length > 0) facetBase.section = { slug: { in: filters.section } };
  if (filters.subject.length > 0) facetBase.subject = { slug: { in: filters.subject } };
  if (filters.trimestre.length > 0) facetBase.trimester = { in: filters.trimestre };
  if (filters.year.length > 0) facetBase.year = { in: filters.year };
  if (filters.language.length > 0) facetBase.language = { in: filters.language };
  if (filters.hasCorrection) facetBase.hasCorrection = true;
  if (filters.teacherId) {
    // Reuse the converted cuid from the main where clause
    facetBase.teacherId = where.teacherId as string;
  }

  // Sort
  let orderBy: Prisma.ResourceOrderByWithRelationInput = { publishedAt: 'desc' };
  if (sort === 'popular') orderBy = { viewsCount: 'desc' };
  else if (sort === 'downloads') orderBy = { downloadsCount: 'desc' };
  else if (sort === 'rating') orderBy = { ratingCount: 'desc' };
  else if (sort === 'oldest') orderBy = { publishedAt: 'asc' };

  // Run all queries in parallel
  const [
    resources,
    total,
    byType,
    byTrimestre,
    byYear,
    byLanguage,
    withCorrectionCount,
  ] = await Promise.all([
    prisma.resource.findMany({
      where,
      take: pageSize,
      skip,
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

  // Format simple facets
  const byTypeMap: Record<string, number> = {};
  byType.forEach((b) => {
    if (b.type && b._count && typeof b._count === 'object') byTypeMap[b.type] = b._count._all ?? 0;
  });

  const byTrimestreMap: Record<string, number> = {};
  byTrimestre.forEach((b) => {
    if (b.trimester && b._count && typeof b._count === 'object') byTrimestreMap[b.trimester] = b._count._all ?? 0;
  });

  const byYearMap: Record<string, number> = {};
  byYear.forEach((b) => {
    if (b.year && b._count && typeof b._count === 'object') byYearMap[b.year] = b._count._all ?? 0;
  });

  const byLanguageMap: Record<string, number> = {};
  byLanguage.forEach((b) => {
    if (b.language && b._count && typeof b._count === 'object') byLanguageMap[b.language] = b._count._all ?? 0;
  });

  // For class/section/subject facets: use findMany with select instead of groupBy
  // (Prisma TS type for `not: null` on nullable strings is awkward; we filter in JS)
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

  // Resolve class slugs
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

  // Build facet maps: slug -> count
  const byClassMap: Record<string, number> = {};
  classGroups.forEach((g) => {
    const c = classes.find((x) => x.id === g.classId);
    if (c && g._count && typeof g._count === 'object') byClassMap[c.slug] = g._count._all ?? 0;
  });

  const bySectionMap: Record<string, number> = {};
  sectionGroups.forEach((g) => {
    const s = sections.find((x) => x.id === g.sectionId);
    if (s && g._count && typeof g._count === 'object') bySectionMap[s.slug] = g._count._all ?? 0;
  });

  const bySubjectMap: Record<string, number> = {};
  subjectGroups.forEach((g) => {
    const s = subjects.find((x) => x.id === g.subjectId);
    if (s && g._count && typeof g._count === 'object') bySubjectMap[s.slug] = g._count._all ?? 0;
  });

  const response: RessourcesResponse = {
    resources,
    total,
    totalPages: Math.ceil(total / pageSize),
    currentPage: page,
    facets: {
      byType: byTypeMap,
      byTrimestre: byTrimestreMap,
      byYear: byYearMap,
      byLanguage: byLanguageMap,
      byClass: byClassMap,
      bySection: bySectionMap,
      bySubject: bySubjectMap,
      withCorrection: withCorrectionCount,
    },
    nameMaps: {
      class: Object.fromEntries(allClasses.map(c => [c.slug, c.nameFr])),
      section: Object.fromEntries(allSections.map(s => [s.slug, s.nameFr])),
      subject: Object.fromEntries(allSubjects.map(s => [s.slug, s.nameFr])),
    },
  };

  return NextResponse.json(response);
}

// updated Fri Jul 17 00:15:17 UTC 2026
