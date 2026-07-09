import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================================
// Search v2: FTS + pg_trgm + Synonyms + Highlighting + Facets
// Strategy:
//   1. Expand query with synonyms (FR/AR)
//   2. FTS via websearch_to_tsquery (stemming, multi-lang)
//   3. pg_trgm fallback for typos via word_similarity > 0.4
//   4. Combine scores (FTS weight 1.0, trgm weight 0.5)
//   5. ts_headline for highlighting
//   6. GROUP BY for facets
// ============================================================================

interface SearchRequest {
  q: string;
  filters?: {
    subject?: string[];
    class?: string[];
    section?: string[];
    type?: string[];
    year?: string[];
    trimester?: string[];
    language?: string[];
    hasCorrection?: boolean;
    teacherId?: string;
  };
  page?: number;
  limit?: number;
  sort?: 'relevance' | 'recent' | 'popular' | 'downloads';
}

export async function GET(req: NextRequest) {
  const t0 = Date.now();
  const params = req.nextUrl.searchParams;

  const q = (params.get('q') || '').trim();
  const page = Math.max(1, parseInt(params.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(params.get('limit') || '20')));
  const offset = (page - 1) * limit;
  const sort = (params.get('sort') || 'relevance') as SearchRequest['sort'];

  // Parse filters
  const filters: SearchRequest['filters'] = {
    subject: params.getAll('subject').filter(Boolean),
    class: params.getAll('class').filter(Boolean),
    section: params.getAll('section').filter(Boolean),
    type: params.getAll('type').filter(Boolean),
    year: params.getAll('year').filter(Boolean),
    trimester: params.getAll('trimestre').filter(Boolean),
    language: params.getAll('language').filter(Boolean),
    hasCorrection: params.get('hasCorrection') === 'true' || undefined,
    teacherId: params.get('teacherId') || undefined,
  };

  try {
    // Pre-fetch all synonyms for query expansion
    const synonyms = await prisma.searchSynonym.findMany({
      select: { term: true, synonyms: true, language: true, category: true },
    });

    // Expand query with synonyms
    const expandedQuery = expandQueryWithSynonyms(q, synonyms);
    const ftsQuery = expandedQuery.expanded || q;

    // Build additional WHERE clauses for filters
    const filterClauses: string[] = ['r.status = \'PUBLISHED\''];
    const filterParams: any[] = [];
    let paramIdx = 1; // $1 = ftsQuery
    if (filters.subject?.length) {
      filterClauses.push(`r."subjectId" IN (${filters.subject.map(() => `$${++paramIdx}`).join(',')})`);
      filterParams.push(...filters.subject);
    }
    if (filters.class?.length) {
      filterClauses.push(`r."classId" IN (${filters.class.map(() => `$${++paramIdx}`).join(',')})`);
      filterParams.push(...filters.class);
    }
    if (filters.section?.length) {
      filterClauses.push(`r."sectionId" IN (${filters.section.map(() => `$${++paramIdx}`).join(',')})`);
      filterParams.push(...filters.section);
    }
    if (filters.type?.length) {
      filterClauses.push(`r.type::text = ANY($${++paramIdx}::text[])`);
      filterParams.push(filters.type);
    }
    if (filters.year?.length) {
      filterClauses.push(`r.year = ANY($${++paramIdx}::text[])`);
      filterParams.push(filters.year);
    }
    if (filters.trimester?.length) {
      filterClauses.push(`r."trimester" = ANY($${++paramIdx}::text[])`);
      filterParams.push(filters.trimester);
    }
    if (filters.language?.length) {
      filterClauses.push(`r.language = ANY($${++paramIdx}::text[])`);
      filterParams.push(filters.language);
    }
    if (filters.hasCorrection !== undefined) {
      filterClauses.push(`r."hasCorrection" = $${++paramIdx}`);
      filterParams.push(filters.hasCorrection);
    }
    if (filters.teacherId) {
      filterClauses.push(`r."teacherId" = $${++paramIdx}`);
      filterParams.push(filters.teacherId);
    }

    // Set trigram threshold low for better recall
    await prisma.$executeRawUnsafe('SELECT set_limit(0.15)');

    // Main search query: FTS + pg_trgm
    const orderBy = sort === 'recent'
      ? 'r."publishedAt" DESC NULLS LAST'
      : sort === 'popular'
      ? 'r."viewsCount" DESC NULLS LAST'
      : sort === 'downloads'
      ? 'r."downloadsCount" DESC NULLS LAST'
      : 'combined_score DESC';

    const sql = `
      WITH fts_hits AS (
        SELECT
          r.id,
          ts_rank_cd(r.search_vector, websearch_to_tsquery('french', $1)) AS fts_score
        FROM "Resource" r
        WHERE r.search_vector @@ websearch_to_tsquery('french', $1)
          ${filterClauses.map(c => 'AND ' + c).join('\n          ')}
        ORDER BY fts_score DESC
        LIMIT 500
      ),
      trgm_hits AS (
        SELECT
          r.id,
          GREATEST(
            word_similarity($1, r.title),
            word_similarity($1, COALESCE(r.description, ''))
          ) AS trgm_score
        FROM "Resource" r
        WHERE (
            word_similarity($1, r.title) > 0.4
            OR word_similarity($1, COALESCE(r.description, '')) > 0.4
          )
          ${filterClauses.map(c => 'AND ' + c).join('\n          ')}
        ORDER BY trgm_score DESC
        LIMIT 500
      ),
      combined AS (
        SELECT
          COALESCE(f.id, t.id) AS id,
          COALESCE(f.fts_score, 0) + COALESCE(t.trgm_score * 0.5, 0) AS combined_score,
          COALESCE(f.fts_score, 0) AS fts_score,
          COALESCE(t.trgm_score, 0) AS trgm_score
        FROM fts_hits f
        FULL OUTER JOIN trgm_hits t ON t.id = f.id
      )
      SELECT
        c.id,
        c.combined_score,
        c.fts_score,
        c.trgm_score,
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
      FROM combined c
      JOIN "Resource" r ON r.id = c.id
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const allParams = [ftsQuery, ...filterParams];
    const results = await prisma.$queryRawUnsafe(sql, ...allParams) as any[];

    // Hydrate with relations
    const ids = results.map(r => r.id);
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

    const hydrated = results.map(r => {
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

    // Total count
    const countSql = `
      WITH fts_hits AS (
        SELECT id FROM "Resource" r
        WHERE r.search_vector @@ websearch_to_tsquery('french', $1)
          ${filterClauses.map(c => 'AND ' + c).join('\n          ')}
        LIMIT 1000
      ),
      trgm_hits AS (
        SELECT id FROM "Resource" r
        WHERE (
            word_similarity($1, r.title) > 0.4
            OR word_similarity($1, COALESCE(r.description, '')) > 0.4
          )
          ${filterClauses.map(c => 'AND ' + c).join('\n          ')}
        LIMIT 1000
      )
      SELECT COUNT(DISTINCT COALESCE(f.id, t.id)) AS total
      FROM fts_hits f
      FULL OUTER JOIN trgm_hits t ON t.id = f.id
    `;
    const countResult = await prisma.$queryRawUnsafe(countSql, ...allParams) as any[];
    const total = parseInt(countResult[0]?.total || '0', 10);

    // Facets
    const facetSql = `
      WITH matched AS (
        SELECT
          r.id,
          r.type,
          r."subjectId",
          r."classId",
          r."sectionId",
          r.year,
          r."trimester",
          r.language,
          r."hasCorrection"
        FROM "Resource" r
        WHERE r.search_vector @@ websearch_to_tsquery('french', $1)
           OR word_similarity($1, r.title) > 0.4
           OR word_similarity($1, COALESCE(r.description, '')) > 0.4
      )
      SELECT
        type::text AS type,
        "subjectId",
        "classId",
        "sectionId",
        year,
        "trimester",
        language,
        "hasCorrection"
      FROM matched
      WHERE id IN (
        SELECT id FROM "Resource" r
        WHERE r.search_vector @@ websearch_to_tsquery('french', $1)
           OR word_similarity($1, r.title) > 0.4
        LIMIT 5000
      )
    `;
    const facetRows = await prisma.$queryRawUnsafe(facetSql, ftsQuery) as any[];

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
      synonymsApplied: expandedQuery.applied,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      sort,
      durationMs,
      filters,
      results: hydrated,
      facets,
    });
  } catch (e: any) {
    console.error('Search v2 error:', e);
    return NextResponse.json(
      { error: 'Search failed', message: e.message, stack: e.stack?.split('\n').slice(0, 3) },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper: expand query with synonyms
// ============================================================================
function expandQueryWithSynonyms(q: string, synonyms: any[]): { expanded: string; applied: string[] } {
  if (!q) return { expanded: '', applied: [] };
  const lower = q.toLowerCase();
  const tokens = lower.split(/\s+/);
  const applied: string[] = [];
  const expanded: string[] = [];

  for (const token of tokens) {
    let added = false;
    for (const syn of synonyms) {
      const allTerms = [syn.term, ...(syn.synonyms || [])];
      if (allTerms.includes(token)) {
        // Add the canonical term + the others
        expanded.push(syn.term);
        for (const s of syn.synonyms || []) {
          if (s !== token && !expanded.includes(s)) expanded.push(s);
        }
        applied.push(`${token} → ${allTerms.join(', ')}`);
        added = true;
        break;
      }
    }
    if (!added) expanded.push(token);
  }

  return { expanded: expanded.join(' | '), applied };
}
