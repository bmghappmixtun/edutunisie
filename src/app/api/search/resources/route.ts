import { NextRequest, NextResponse } from 'next/server';
import { sanitizeHighlightHtml } from '@/lib/security';
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
  if (year) where.year = year;
  if (hasCorrection === 'true') where.hasCorrection = true;
  if (hasCorrection === 'false') where.hasCorrection = false;
  if (homeworkSubtype && ['CONTROL', 'SYNTHESIS', 'HOUSEWORK'].includes(homeworkSubtype)) {
    where.homeworkSubtype = homeworkSubtype;
  }
  if (schoolType && ['PUBLIC', 'PRIVATE', 'PILOTE'].includes(schoolType)) {
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

    // Build WHERE conditions for filters
    // $1 = trimmed (always), filters use $2..$N, limit and offset are the last 2
    const filterConditions: string[] = [];
    const filterParams: any[] = [];
    let paramIndex = 1; // $1 = trimmed
    if (subjectId) { filterConditions.push(`AND r."subjectId" = $${++paramIndex}`); filterParams.push(subjectId); }
    if (classId) { filterConditions.push(`AND r."classId" = $${++paramIndex}`); filterParams.push(classId); }
    if (teacherId) { filterConditions.push(`AND r."teacherId" = $${++paramIndex}`); filterParams.push(teacherId); }
    if (sectionId) { filterConditions.push(`AND r."sectionId" = $${++paramIndex}`); filterParams.push(sectionId); }
    if (type) { filterConditions.push(`AND r.type = $${++paramIndex}`); filterParams.push(type); }
    if (year) { filterConditions.push(`AND r.year = $${++paramIndex}`); filterParams.push(year); }
    if (hasCorrection === 'true') filterConditions.push(`AND r."hasCorrection" = true`);
    if (hasCorrection === 'false') filterConditions.push(`AND r."hasCorrection" = false`);
    if (homeworkSubtype) { filterConditions.push(`AND r."homeworkSubtype" = $${++paramIndex}`); filterParams.push(homeworkSubtype); }
    if (schoolType) { filterConditions.push(`AND r."schoolType" = $${++paramIndex}`); filterParams.push(schoolType); }
    if (fromDate) { filterConditions.push(`AND r."publishedAt" >= $${++paramIndex}`); filterParams.push(new Date(fromDate)); }
    if (toDate) { filterConditions.push(`AND r."publishedAt" <= $${++paramIndex}`); filterParams.push(new Date(toDate)); }
    const limitParam = ++paramIndex;
    const offsetParam = ++paramIndex;
    const orderByClause = sort === 'popular' ? 'r."viewsCount" DESC'
      : sort === 'downloads' ? 'r."downloadsCount" DESC'
      : sort === 'recent' ? 'r."publishedAt" DESC NULLS LAST'
      : 'rank DESC';
    
    const sql = `
      SELECT
        r.id, r.slug, r.title, r.description, r.summary, r.type, r.status,
        r."fileKey", r."fileUrl", r."fileSize", r."pageCount",
        r."classId", r."subjectId", r."teacherId", r."trimester", r.year,
        r.tags, r.language, r."metaDescription", r."headerData",
        r."homeworkSubtype", r."homeworkNumber", r."schoolType", r.product,
        r."hasCorrection", r."viewsCount", r."downloadsCount", r."ratingCount",
        r."avgRating", r."commentsCount", r."favoritesCount",
        r."createdAt", r."updatedAt", r."publishedAt",
        ts_rank(r.search_vector, websearch_to_tsquery('french', $1)) as rank
      FROM "Resource" r
      WHERE r.status = 'PUBLISHED'
        AND r.search_vector @@ websearch_to_tsquery('french', $1)
        ${filterConditions.join('\n        ')}
      ORDER BY ${orderByClause}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;
    
    const countSql = `
      SELECT COUNT(*)::int as total
      FROM "Resource" r
      WHERE r.status = 'PUBLISHED'
        AND r.search_vector @@ websearch_to_tsquery('french', $1)
        ${filterConditions.join('\n        ')}
    `;

    try {
      const ftsResults = await prisma.$queryRawUnsafe<any[]>(sql, trimmed, ...filterParams, limit, (page - 1) * limit);
      const countResult = await prisma.$queryRawUnsafe<any[]>(countSql, trimmed, ...filterParams);
      
      results = ftsResults;
      total = Number(countResult[0]?.total || 0);
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
          class: { select: { nameFr: true, nameAr: true, slug: true  } },
          section: { select: { nameFr: true, nameAr: true, slug: true, } },
          teacher: { select: { id: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true, avatarUrl: true, schoolName: true } },}
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

// cache bust 1783013641

// year fix deployed 1783014623
