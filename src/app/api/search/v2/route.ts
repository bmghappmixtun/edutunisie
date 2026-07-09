import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================================
// Search v2: FTS + pg_trgm + Synonyms + Highlighting + Facets
// Simplified & reliable version
// ============================================================================

export async function GET(req: NextRequest) {
  const t0 = Date.now();
  const params = req.nextUrl.searchParams;

  const q = (params.get('q') || '').trim();
  const page = Math.max(1, parseInt(params.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(params.get('limit') || '20')));
  const offset = (page - 1) * limit;
  const sort = params.get('sort') || 'relevance';

  // Parse filters
  const subjects = params.getAll('subject').filter(Boolean);
  const classes = params.getAll('class').filter(Boolean);
  const sections = params.getAll('section').filter(Boolean);
  const types = params.getAll('type').filter(Boolean);
  const years = params.getAll('year').filter(Boolean);
  const trimestres = params.getAll('trimestre').filter(Boolean);
  const languages = params.getAll('language').filter(Boolean);
  const hasCorrection = params.get('hasCorrection') === 'true' ? true : undefined;
  const teacherId = params.get('teacherId') || undefined;

  try {
    // Pre-fetch all synonyms for query expansion
    const synonyms = await prisma.searchSynonym.findMany({
      select: { term: true, synonyms: true, category: true },
    });

    // Expand query with synonyms (for trgm matching)
    const expandedQuery = expandQueryWithSynonyms(q, synonyms);
    const ftsQuery = q;
    const trgmQuery = expandedQuery.expanded || q;

    // Resolve slugs to IDs
    let subjectIds: string[] = [];
    let classIds: string[] = [];
    let sectionIds: string[] = [];

    if (subjects.length) {
      const r = await prisma.subject.findMany({
        where: { slug: { in: subjects } },
        select: { id: true },
      });
      subjectIds = r.map(s => s.id);
      if (!subjectIds.length) {
        return emptyResult({ q, page, limit, t0, subjects, classes, sections });
      }
    }
    if (classes.length) {
      const r = await prisma.class.findMany({
        where: { slug: { in: classes } },
        select: { id: true },
      });
      classIds = r.map(c => c.id);
      if (!classIds.length) {
        return emptyResult({ q, page, limit, t0, subjects, classes, sections });
      }
    }
    if (sections.length) {
      const r = await prisma.section.findMany({
        where: { slug: { in: sections } },
        select: { id: true },
      });
      sectionIds = r.map(s => s.id);
      if (!sectionIds.length) {
        return emptyResult({ q, page, limit, t0, subjects, classes, sections });
      }
    }

    // Set trigram threshold
    await prisma.$executeRawUnsafe('SELECT set_limit(0.15)');

    // ============================================================
    // Strategy: Single CTE with conditional WHERE
    // $1 = ftsQuery, $2 = trgmQuery, $3+ = filter arrays
    // ============================================================
    const filterParams: any[] = [];
    let pIdx = 2;
    const filterConditions: string[] = [];

    if (subjectIds.length) {
      filterConditions.push(`r."subjectId" = ANY($${++pIdx}::text[])`);
      filterParams.push(subjectIds);
    }
    if (classIds.length) {
      filterConditions.push(`r."classId" = ANY($${++pIdx}::text[])`);
      filterParams.push(classIds);
    }
    if (sectionIds.length) {
      filterConditions.push(`r."sectionId" = ANY($${++pIdx}::text[])`);
      filterParams.push(sectionIds);
    }
    if (types.length) {
      filterConditions.push(`r.type::text = ANY($${++pIdx}::text[])`);
      filterParams.push(types);
    }
    if (years.length) {
      filterConditions.push(`r.year = ANY($${++pIdx}::text[])`);
      filterParams.push(years);
    }
    if (trimestres.length) {
      filterConditions.push(`r."trimester" = ANY($${++pIdx}::text[])`);
      filterParams.push(trimestres);
    }
    if (languages.length) {
      filterConditions.push(`r.language = ANY($${++pIdx}::text[])`);
      filterParams.push(languages);
    }
    if (hasCorrection !== undefined) {
      filterConditions.push(`r."hasCorrection" = $${++pIdx}`);
      filterParams.push(hasCorrection);
    }
    if (teacherId) {
      filterConditions.push(`r."teacherId" = $${++pIdx}`);
      filterParams.push(teacherId);
    }

    const whereExtras = filterConditions.length
      ? 'AND ' + filterConditions.join(' AND ')
      : '';

    // ============================================================
    // Main search: UNION of FTS + pg_trgm
    // ============================================================
    const orderBy = sort === 'recent'
      ? 'r."publishedAt" DESC NULLS LAST'
      : sort === 'popular'
      ? 'r."viewsCount" DESC NULLS LAST'
      : sort === 'downloads'
      ? 'r."downloadsCount" DESC NULLS LAST'
      : 'combined_score DESC';

    const searchSql = `
      WITH matched AS (
        SELECT
          r.id,
          COALESCE(fts.score, 0) + COALESCE(trgm.score * 0.5, 0) AS combined_score,
          COALESCE(fts.score, 0) AS fts_score,
          COALESCE(trgm.score, 0) AS trgm_score
        FROM "Resource" r
        LEFT JOIN LATERAL (
          SELECT ts_rank_cd(r.search_vector, websearch_to_tsquery('french', $1)) AS score
          WHERE r.search_vector @@ websearch_to_tsquery('french', $1)
          LIMIT 1
        ) fts ON true
        LEFT JOIN LATERAL (
          SELECT GREATEST(
            word_similarity($2, r.title),
            word_similarity($2, COALESCE(r.description, ''))
          ) AS score
          WHERE (
            word_similarity($2, r.title) > 0.4
            OR word_similarity($2, COALESCE(r.description, '')) > 0.4
          )
          LIMIT 1
        ) trgm ON true
        WHERE r.status = 'PUBLISHED'
          AND (fts.score IS NOT NULL OR trgm.score IS NOT NULL)
          ${whereExtras}
      )
      SELECT
        m.id,
        m.combined_score,
        m.fts_score,
        m.trgm_score,
        ts_headline(
          'french',
          r.title,
          websearch_to_tsquery('french', $1),
          'StartSel=<mark>,StopSel=</mark>,MaxFragments=1,MaxWords=20,MinWords=5'
        ) AS title_highlighted,
        ts_headline(
          'french',
          COALESCE(r.description, ''),
          websearch_to_tsquery('french', $1),
          'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=15,MinWords=5'
        ) AS description_highlighted
      FROM matched m
      JOIN "Resource" r ON r.id = m.id
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const allParams = [ftsQuery, trgmQuery, ...filterParams];
    const rawResults = await prisma.$queryRawUnsafe(searchSql, ...allParams) as any[];

    // Hydrate
    const ids = rawResults.map(r => r.id);
    const full = await prisma.resource.findMany({
      where: { id: { in: ids } },
      include: {
        subject: { select: { nameFr: true, slug: true, color: true } },
        class: { select: { nameFr: true, slug: true } },
        section: { select: { nameFr: true, slug: true } },
        teacher: { select: { firstName: true, lastName: true } },
      },
    });
    const byId = new Map(full.map(r => [r.id, r]));

    const results = rawResults.map(r => {
      const f = byId.get(r.id);
      return {
        id: r.id,
        slug: f?.slug,
        title: f?.title,
        titleHighlighted: r.title_highlighted,
        descriptionHighlighted: r.description_highlighted,
        type: f?.type,
        subject: f?.subject,
        class: f?.class,
        section: f?.section,
        year: f?.year,
        trimester: f?.trimester,
        language: f?.language,
        hasCorrection: f?.hasCorrection,
        teacher: f?.teacher,
        viewsCount: f?.viewsCount,
        downloadsCount: f?.downloadsCount,
        publishedAt: f?.publishedAt,
        score: parseFloat(r.combined_score),
        ftsScore: parseFloat(r.fts_score),
        trgmScore: parseFloat(r.trgm_score),
      };
    });

    // ============================================================
    // Total count (same WHERE, just count)
    // ============================================================
    const countSql = `
      SELECT count(*)::int AS total
      FROM "Resource" r
      WHERE r.status = 'PUBLISHED'
        AND (
          r.search_vector @@ websearch_to_tsquery('french', $1)
          OR word_similarity($2, r.title) > 0.4
          OR word_similarity($2, COALESCE(r.description, '')) > 0.4
        )
        ${whereExtras}
    `;
    const countResult = await prisma.$queryRawUnsafe(countSql, ...allParams) as any[];
    const total = countResult[0]?.total || 0;

    // ============================================================
    // Facets (respect query but not the other filters for discovery)
    // ============================================================
    const facetSql = `
      SELECT
        r.type::text AS type,
        r."subjectId" AS "subjectId",
        r."classId" AS "classId",
        r."sectionId" AS "sectionId",
        r.year AS year,
        r."trimester" AS trimester,
        r.language AS language,
        r."hasCorrection" AS "hasCorrection"
      FROM "Resource" r
      WHERE r.status = 'PUBLISHED'
        AND (
          r.search_vector @@ websearch_to_tsquery('french', $1)
          OR word_similarity($2, r.title) > 0.4
          OR word_similarity($2, COALESCE(r.description, '')) > 0.4
        )
      LIMIT 5000
    `;
    const facetRows = await prisma.$queryRawUnsafe(facetSql, ftsQuery, trgmQuery) as any[];

    // Build facet counts
    const facets: any = {};
    const facetKeys = ['type', 'subjectId', 'classId', 'sectionId', 'year', 'trimester', 'language'];
    for (const key of facetKeys) {
      const counts: Record<string, number> = {};
      facetRows.forEach(row => {
        const v = row[key];
        if (v !== null && v !== undefined) {
          counts[v] = (counts[v] || 0) + 1;
        }
      });
      facets[key] = counts;
    }
    facets.hasCorrection = facetRows.filter(r => r.hasCorrection).length;

    const durationMs = Date.now() - t0;

    return NextResponse.json({
      query: q,
      expandedQuery: expandedQuery.expanded !== q ? expandedQuery.expanded : undefined,
      synonymsApplied: expandedQuery.applied.length ? expandedQuery.applied : undefined,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      sort,
      durationMs,
      filters: {
        subject: subjects, class: classes, section: sections,
        type: types, year: years, trimestre: trimestres, language: languages,
        hasCorrection, teacherId,
      },
      results,
      facets,
    });
  } catch (e: any) {
    console.error('[search v2]', e);
    return NextResponse.json(
      { error: 'Search failed', message: e.message?.slice(0, 500) },
      { status: 500 }
    );
  }
}

function emptyResult(opts: {
  q: string; page: number; limit: number; t0: number;
  subjects: string[]; classes: string[]; sections: string[];
}) {
  return NextResponse.json({
    query: opts.q, page: opts.page, limit: opts.limit,
    total: 0, totalPages: 0, sort: 'relevance',
    durationMs: Date.now() - opts.t0,
    filters: { subject: opts.subjects, class: opts.classes, section: opts.sections },
    results: [], facets: {},
  });
}

function expandQueryWithSynonyms(q: string, synonyms: any[]): { expanded: string; applied: string[] } {
  if (!q) return { expanded: '', applied: [] };
  const lower = q.toLowerCase().trim();
  const tokens = lower.split(/\s+/);
  const applied: string[] = [];
  const expandedSet = new Set<string>();

  for (const token of tokens) {
    let found = false;
    for (const syn of synonyms) {
      const allTerms = [syn.term.toLowerCase(), ...(syn.synonyms || []).map((s: string) => s.toLowerCase())];
      if (allTerms.includes(token)) {
        for (const t of allTerms) expandedSet.add(t);
        applied.push(`${token} → ${syn.term}`);
        found = true;
        break;
      }
    }
    if (!found) expandedSet.add(token);
  }

  return { expanded: Array.from(expandedSet).join(' '), applied };
}
