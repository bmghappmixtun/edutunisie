import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SORT_OPTIONS = ['relevance', 'recent', 'popular', 'downloads', 'rating'] as const;

export async function GET(req: NextRequest) {
  const start = Date.now();
  const params = req.nextUrl.searchParams;
  const q = params.get('q') || '';
  const page = Math.max(1, parseInt(params.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(params.get('limit') || '12')));
  const sort = (params.get('sort') || 'relevance') as (typeof SORT_OPTIONS)[number];

  // Filters
  const subjectId = params.get('subject');
  const classId = params.get('class');
  const teacherId = params.get('teacher');
  const sectionId = params.get('section');
  const type = params.get('type');
  const year = params.get('year');
  const fromDate = params.get('from');
  const toDate = params.get('to');
  const hasFile = params.get('hasFile') === 'true';
  const hasCorrection = params.get('hasCorrection'); // 'true' | 'false' | null
  const homeworkSubtype = params.get('homeworkSubtype'); // CONTROL | SYNTHESIS | HOUSEWORK
  const schoolType = params.get('schoolType'); // PUBLIC | PILOTE

  // Build filter conditions
  const where: any = { status: 'PUBLISHED' };
  if (subjectId) where.subjectId = subjectId;
  if (classId) where.classId = classId;
  if (teacherId) where.teacherId = teacherId;
  if (sectionId) where.sectionId = sectionId;
  if (type) where.type = type;
  if (year) where.year = parseInt(year);
  if (hasCorrection === 'true') where.hasCorrection = true;
  if (hasCorrection === 'false') where.hasCorrection = false;
  if (homeworkSubtype && ['CONTROL', 'SYNTHESIS', 'HOUSEWORK'].includes(homeworkSubtype)) {
    where.homeworkSubtype = homeworkSubtype;
  }
  if (schoolType && ['PUBLIC', 'PILOTE'].includes(schoolType)) {
    where.schoolType = schoolType;
  }
  if (fromDate || toDate) {
    where.publishedAt = {};
    if (fromDate) where.publishedAt.gte = new Date(fromDate);
    if (toDate) where.publishedAt.lte = new Date(toDate);
  }

  let results: any[];
  let total: number;

  if (q.trim()) {
    // Sanitize query for FTS: max 200 chars, strip non-word chars
    const trimmed = q.trim().slice(0, 200).replace(/[^\w\s\-àâäéèêëïîôöùûüÿçñ]/gi, ' ');

    try {
      const ftsResults = await prisma.$queryRaw<any[]>`
        SELECT
          r.*,
          ts_rank(r.search_vector, websearch_to_tsquery('french', ${trimmed})) as rank
        FROM "Resource" r
        WHERE r.status = 'PUBLISHED'
          AND r.search_vector @@ websearch_to_tsquery('french', ${trimmed})
          ${subjectId ? prisma.$queryRaw`AND r."subjectId" = ${subjectId}` : prisma.$queryRaw``}
          ${classId ? prisma.$queryRaw`AND r."classId" = ${classId}` : prisma.$queryRaw``}
          ${teacherId ? prisma.$queryRaw`AND r."teacherId" = ${teacherId}` : prisma.$queryRaw``}
          ${sectionId ? prisma.$queryRaw`AND r."sectionId" = ${sectionId}` : prisma.$queryRaw``}
          ${type ? prisma.$queryRaw`AND r.type = ${type}` : prisma.$queryRaw``}
        ORDER BY ${sort === 'relevance' ? prisma.$queryRaw`rank DESC` :
                  sort === 'recent' ? prisma.$queryRaw`r."publishedAt" DESC NULLS LAST` :
                  sort === 'popular' ? prisma.$queryRaw`r."viewsCount" DESC` :
                  sort === 'downloads' ? prisma.$queryRaw`r."downloadsCount" DESC` :
                  prisma.$queryRaw`r."publishedAt" DESC NULLS LAST`}
        LIMIT ${limit} OFFSET ${(page - 1) * limit}
      `;

      results = ftsResults;
      total = ftsResults.length;
    } catch (ftsError: any) {
      // FTS failed (e.g., no match, syntax error) - return empty result
      console.warn('[search] FTS error for query:', trimmed, ftsError?.message);
      results = [];
      total = 0;
    }
  } else {
    // No search query - just filters
    const orderBy: any =
      sort === 'recent' ? { publishedAt: 'desc' } :
      sort === 'popular' ? { viewsCount: 'desc' } :
      sort === 'downloads' ? { downloadsCount: 'desc' } :
      { publishedAt: 'desc' };

    [results, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          subject: { select: { nameFr: true, nameAr: true, slug: true, color: true, icon: true } },
          class: { select: { nameFr: true, nameAr: true, slug: true } },
          section: { select: { nameFr: true, nameAr: true, slug: true } },
          teacher: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, schoolName: true } }
        }
      }),
      prisma.resource.count({ where })
    ]);
  }

  // Get filter options (counts) + lookup names
  const [subjectCounts, classCounts, typeCounts, yearCounts, teacherCounts, allSubjects, allClasses, allTeachers] = await Promise.all([
    prisma.resource.groupBy({
      by: ['subjectId'],
      where: { status: 'PUBLISHED' },
      _count: { _all: true }
    }),
    prisma.resource.groupBy({
      by: ['classId'],
      where: { status: 'PUBLISHED', classId: { not: null } },
      _count: { _all: true }
    }),
    prisma.resource.groupBy({
      by: ['type'],
      where: { status: 'PUBLISHED' },
      _count: { _all: true }
    }),
    prisma.resource.groupBy({
      by: ['year'],
      where: { status: 'PUBLISHED', year: { not: null } },
      _count: { _all: true },
      orderBy: { year: 'desc' }
    }),
    prisma.resource.groupBy({
      by: ['teacherId'],
      where: { status: 'PUBLISHED' },
      _count: { _all: true },
      take: 20,
      orderBy: { _count: { teacherId: 'desc' } }
    }),
    prisma.subject.findMany({ orderBy: { order: 'asc' }, select: { id: true, nameFr: true, icon: true } }),
    prisma.class.findMany({ orderBy: { order: 'asc' }, select: { id: true, nameFr: true } }),
    prisma.user.findMany({
      where: { role: 'TEACHER', status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true },
      take: 30
    })
  ]);

  return NextResponse.json({
    query: q,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    sort,
    filters: { subjectId, classId, teacherId, sectionId, type, year, fromDate, toDate },
    results: results.map(r => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      type: r.type,
      year: r.year,
      trimester: r.trimester,
      pageCount: r.pageCount,
      fileSize: r.fileSize,
      viewsCount: r.viewsCount,
      downloadsCount: r.downloadsCount,
      averageRating: r.averageRating || 0,
      publishedAt: r.publishedAt,
      // Homework & school metadata (NEW)
      homeworkSubtype: r.homeworkSubtype,
      homeworkNumber: r.homeworkNumber,
      schoolType: r.schoolType,
      product: r.product,
      hasCorrection: r.hasCorrection,
      correctionSummary: r.correctionSummary,
      subject: r.subject,
      class: r.class,
      section: r.section,
      teacher: r.teacher,
      rank: r.rank
    })),
    facets: {
      subjects: subjectCounts.map(s => ({ id: s.subjectId, count: s._count._all })),
      classes: classCounts.map(c => ({ id: c.classId, count: c._count._all })),
      types: typeCounts.map(t => ({ value: t.type, count: t._count._all })),
      years: yearCounts.map(y => ({ value: y.year, count: y._count._all })),
      teachers: teacherCounts.map(t => ({ id: t.teacherId, count: t._count._all }))
    },
    options: {
      subjects: allSubjects.filter(s => subjectCounts.some(c => c.subjectId === s.id && c._count._all > 0)),
      classes: allClasses.filter(c => classCounts.some(cc => cc.classId === c.id && cc._count._all > 0)),
      teachers: allTeachers
        .filter(t => teacherCounts.some(tc => tc.teacherId === t.id && tc._count._all > 0))
        .map(t => ({ id: t.id, name: `${t.firstName || ""} ${t.lastName || ""}` })),
      types: typeCounts,
      years: yearCounts
    },
    took: Date.now() - start
  });
}
