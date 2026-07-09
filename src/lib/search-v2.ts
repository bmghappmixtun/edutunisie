/**
 * search-v2.ts
 * Shared search engine: FTS + pg_trgm + Synonyms + Highlighting + Facets
 * Used by both /api/search/v2 (AJAX) and /recherche (SSR)
 */
import { prisma } from './prisma';

export interface SearchFilters {
  subject?: string[];
  class?: string[];
  section?: string[];
  type?: string[];
  year?: string[];
  trimester?: string[];
  language?: string[];
  hasCorrection?: boolean;
  teacherId?: string;
}

export interface SearchOptions {
  q?: string;
  filters?: SearchFilters;
  page?: number;
  limit?: number;
  sort?: 'relevance' | 'recent' | 'popular' | 'downloads';
}

export interface SearchResult {
  id: string;
  slug: string | null;
  title: string | null;
  titleHighlighted: string | null;
  descriptionHighlighted: string | null;
  type: string | null;
  subject: { nameFr: string; slug: string; color: string | null } | null;
  class: { nameFr: string; slug: string } | null;
  section: { nameFr: string; slug: string } | null;
  teacher: { firstName: string | null; lastName: string | null } | null;
  year: string | null;
  trimester: string | null;
  language: string | null;
  hasCorrection: boolean | null;
  viewsCount: number | null;
  downloadsCount: number | null;
  publishedAt: Date | string | null;
  score: number;
  ftsScore: number;
  trgmScore: number;
}

export interface SearchResponse {
  query: string;
  expandedQuery?: string;
  synonymsApplied: string[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sort: string;
  durationMs: number;
  filters: SearchFilters;
  results: SearchResult[];
  facets: {
    type: Record<string, number>;
    subjectId: Record<string, number>;
    classId: Record<string, number>;
    sectionId: Record<string, number>;
    year: Record<string, number>;
    trimester: Record<string, number>;
    language: Record<string, number>;
    hasCorrection: number;
  };
}

// ============================================================================
// Synonym expansion
// ============================================================================
function expandQueryWithSynonyms(q: string, synonyms: { term: string; synonyms: string[] }[]): { expanded: string; applied: string[] } {
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

// ============================================================================
// Main search function
// ============================================================================
export async function searchV2(options: SearchOptions): Promise<SearchResponse> {
  const t0 = Date.now();
  const q = (options.q || '').trim();
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(50, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;
  const sort = options.sort || 'relevance';
  const filters: SearchFilters = options.filters || {};

  // 1. Pre-fetch synonyms
  const synonyms = await prisma.searchSynonym.findMany({
    select: { term: true, synonyms: true },
  });

  // 2. Expand query
  const expandedQuery = expandQueryWithSynonyms(q, synonyms);
  const ftsQuery = q;
  const trgmQuery = expandedQuery.expanded || q;

  // 3. Resolve slugs to IDs
  let subjectIds: string[] = [];
  let classIds: string[] = [];
  let sectionIds: string[] = [];

  if (filters.subject?.length) {
    const r = await prisma.subject.findMany({ where: { slug: { in: filters.subject } }, select: { id: true } });
    subjectIds = r.map(s => s.id);
    if (!subjectIds.length) return emptyResponse({ q, page, limit, sort, filters, t0, expandedQuery, synonymsApplied: expandedQuery.applied });
  }
  if (filters.class?.length) {
    const r = await prisma.class.findMany({ where: { slug: { in: filters.class } }, select: { id: true } });
    classIds = r.map(c => c.id);
    if (!classIds.length) return emptyResponse({ q, page, limit, sort, filters, t0, expandedQuery, synonymsApplied: expandedQuery.applied });
  }
  if (filters.section?.length) {
    const r = await prisma.section.findMany({ where: { slug: { in: filters.section } }, select: { id: true } });
    sectionIds = r.map(s => s.id);
    if (!sectionIds.length) return emptyResponse({ q, page, limit, sort, filters, t0, expandedQuery, synonymsApplied: expandedQuery.applied });
  }

  // 4. Build filter conditions
  await prisma.$executeRawUnsafe('SELECT set_limit(0.15)');

  const filterParams: any[] = [];
  let pIdx = 2; // $1 = ftsQuery, $2 = trgmQuery
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
  if (filters.type?.length) {
    filterConditions.push(`r.type::text = ANY($${++pIdx}::text[])`);
    filterParams.push(filters.type);
  }
  if (filters.year?.length) {
    filterConditions.push(`r.year = ANY($${++pIdx}::text[])`);
    filterParams.push(filters.year);
  }
  if (filters.trimester?.length) {
    filterConditions.push(`r."trimester" = ANY($${++pIdx}::text[])`);
    filterParams.push(filters.trimester);
  }
  if (filters.language?.length) {
    filterConditions.push(`r.language = ANY($${++pIdx}::text[])`);
    filterParams.push(filters.language);
  }
  if (filters.hasCorrection !== undefined) {
    filterConditions.push(`r."hasCorrection" = $${++pIdx}`);
    filterParams.push(filters.hasCorrection);
  }
  if (filters.teacherId) {
    filterConditions.push(`r."teacherId" = $${++pIdx}`);
    filterParams.push(filters.teacherId);
  }

  const whereExtras = filterConditions.length ? 'AND ' + filterConditions.join(' AND ') : '';

  // 5. Main search query (LATERAL JOINs for FTS + trgm)
  const orderBy = sort === 'recent' ? 'r."publishedAt" DESC NULLS LAST' :
    sort === 'popular' ? 'r."viewsCount" DESC NULLS LAST' :
    sort === 'downloads' ? 'r."downloadsCount" DESC NULLS LAST' :
    'combined_score DESC';

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
      ts_headline('french', r.title, websearch_to_tsquery('french', $1),
        'StartSel=<mark>,StopSel=</mark>,MaxFragments=1,MaxWords=20,MinWords=5') AS title_highlighted,
      ts_headline('french', COALESCE(r.description, ''), websearch_to_tsquery('french', $1),
        'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=15,MinWords=5') AS description_highlighted
    FROM matched m
    JOIN "Resource" r ON r.id = m.id
    ORDER BY ${orderBy}
    LIMIT ${limit} OFFSET ${offset}
  `;

  const allParams = [ftsQuery, trgmQuery, ...filterParams];
  const rawResults = await prisma.$queryRawUnsafe(searchSql, ...allParams) as any[];

  // 6. Hydrate
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

  const results: SearchResult[] = rawResults.map(r => {
    const f = byId.get(r.id);
    return {
      id: r.id,
      slug: f?.slug ?? null,
      title: f?.title ?? null,
      titleHighlighted: r.title_highlighted,
      descriptionHighlighted: r.description_highlighted,
      type: f?.type ?? null,
      subject: f?.subject ? { nameFr: f.subject.nameFr, slug: f.subject.slug, color: f.subject.color } : null,
      class: f?.class ? { nameFr: f.class.nameFr, slug: f.class.slug } : null,
      section: f?.section ? { nameFr: f.section.nameFr, slug: f.section.slug } : null,
      teacher: f?.teacher ? { firstName: f.teacher.firstName, lastName: f.teacher.lastName } : null,
      year: f?.year ?? null,
      trimester: f?.trimester ?? null,
      language: f?.language ?? null,
      hasCorrection: f?.hasCorrection ?? null,
      viewsCount: f?.viewsCount ?? null,
      downloadsCount: f?.downloadsCount ?? null,
      publishedAt: f?.publishedAt ?? null,
      score: parseFloat(r.combined_score) || 0,
      ftsScore: parseFloat(r.fts_score) || 0,
      trgmScore: parseFloat(r.trgm_score) || 0,
    };
  });

  // 7. Total count
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

  // 8. Facets (ignoring other filters for discovery)
  const facetSql = `
    SELECT
      r.type::text AS type, r."subjectId", r."classId", r."sectionId",
      r.year, r."trimester", r.language, r."hasCorrection"
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
  const facets: SearchResponse['facets'] = {
    type: {},
    subjectId: {},
    classId: {},
    sectionId: {},
    year: {},
    trimester: {},
    language: {},
    hasCorrection: 0,
  };
  for (const row of facetRows) {
    for (const key of ['type', 'subjectId', 'classId', 'sectionId', 'year', 'trimester', 'language'] as const) {
      const v = row[key];
      if (v !== null && v !== undefined) {
        (facets[key] as any)[v] = ((facets[key] as any)[v] || 0) + 1;
      }
    }
    if (row.hasCorrection) facets.hasCorrection++;
  }

  return {
    query: q,
    expandedQuery: expandedQuery.expanded !== q ? expandedQuery.expanded : undefined,
    synonymsApplied: expandedQuery.applied,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    sort,
    durationMs: Date.now() - t0,
    filters,
    results,
    facets,
  };
}

function emptyResponse(opts: {
  q: string; page: number; limit: number; sort: string;
  filters: SearchFilters; t0: number;
  expandedQuery: { expanded: string; applied: string[] };
  synonymsApplied: string[];
}): SearchResponse {
  return {
    query: opts.q,
    expandedQuery: opts.expandedQuery.expanded !== opts.q ? opts.expandedQuery.expanded : undefined,
    synonymsApplied: opts.synonymsApplied,
    page: opts.page, limit: opts.limit, total: 0, totalPages: 0,
    sort: opts.sort, durationMs: Date.now() - opts.t0, filters: opts.filters,
    results: [],
    facets: { type: {}, subjectId: {}, classId: {}, sectionId: {}, year: {}, trimester: {}, language: {}, hasCorrection: 0 },
  };
}
