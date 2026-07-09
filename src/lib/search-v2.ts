/**
 * search-v2.ts
 * Shared search engine: FTS + pg_trgm + Synonyms + Highlighting + Facets
 *
 * Strategy:
 *   1. Expand query with synonyms → list of variants
 *   2. For each variant, build OR'd FTS + TRGM conditions
 *   3. Best score = MAX across variants (computed in app layer)
 *   4. ts_headline for highlighting (uses original query)
 *   5. GROUP BY for facets (single query, parallel aggregation)
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
  variants: string[];
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
function expandQueryWithSynonyms(q: string, synonyms: { term: string; synonyms: string[] }[]): { variants: string[]; applied: string[] } {
  if (!q) return { variants: [], applied: [] };
  const lower = q.toLowerCase().trim();
  const tokens = lower.split(/\s+/);
  const applied: string[] = [];
  const variants = new Set<string>();

  for (const token of tokens) {
    variants.add(token);
    for (const syn of synonyms) {
      const allTerms = [syn.term.toLowerCase(), ...(syn.synonyms || []).map((s: string) => s.toLowerCase())];
      if (allTerms.includes(token)) {
        for (const t of allTerms) variants.add(t);
        applied.push(`${token} → ${syn.term}`);
        break;
      }
    }
  }

  return { variants: Array.from(variants), applied };
}

// ============================================================================
// Build OR'd SQL conditions for variants
// Params: $1..$N = variants (same set used for FTS and TRGM)
// ============================================================================
function buildMatchConditions(variants: string[]): {
  ftsSql: string;
  trgmSql: string;
  params: any[];
} {
  if (variants.length === 0) {
    return { ftsSql: 'FALSE', trgmSql: 'FALSE', params: [] };
  }
  const ftsParts: string[] = [];
  const trgmParts: string[] = [];
  const params: any[] = [];
  variants.forEach((v, i) => {
    const idx = i + 1;
    ftsParts.push(`search_vector @@ websearch_to_tsquery('french', $${idx})`);
    trgmParts.push(`(word_similarity($${idx}, title) > 0.4 OR word_similarity($${idx}, COALESCE(description, '')) > 0.4)`);
    params.push(v);
  });
  return {
    ftsSql: '(' + ftsParts.join(' OR ') + ')',
    trgmSql: '(' + trgmParts.join(' OR ') + ')',
    params,
  };
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

  // 2. Expand query → list of variants
  const expandedQuery = expandQueryWithSynonyms(q, synonyms);
  const variants = expandedQuery.variants.length > 0 ? expandedQuery.variants : [];

  // 3. Resolve slugs to IDs
  let subjectIds: string[] = [];
  let classIds: string[] = [];
  let sectionIds: string[] = [];

  if (filters.subject?.length) {
    const r = await prisma.subject.findMany({ where: { slug: { in: filters.subject } }, select: { id: true } });
    subjectIds = r.map(s => s.id);
    if (!subjectIds.length) return emptyResponse({ q, page, limit, sort, filters, t0, expandedQuery });
  }
  if (filters.class?.length) {
    const r = await prisma.class.findMany({ where: { slug: { in: filters.class } }, select: { id: true } });
    classIds = r.map(c => c.id);
    if (!classIds.length) return emptyResponse({ q, page, limit, sort, filters, t0, expandedQuery });
  }
  if (filters.section?.length) {
    const r = await prisma.section.findMany({ where: { slug: { in: filters.section } }, select: { id: true } });
    sectionIds = r.map(s => s.id);
    if (!sectionIds.length) return emptyResponse({ q, page, limit, sort, filters, t0, expandedQuery });
  }

  // 4. Build SQL conditions
  const match = buildMatchConditions(variants);
  let pIdx = match.params.length + 1;
  const filterParams: any[] = [];
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

  // 5. Highlight uses the original q (best single match)
  const highlightParam = q || variants[0] || '';
  const highlightIdx = pIdx;
  pIdx++;

  // 6. Build final params
  const allParams = [...match.params, ...filterParams, highlightParam];

  // 7. Main search query
  // For FTS score: use MAX across all variants (compute via subquery)
  // For TRGM score: use MAX across all variants
  // To avoid 2N+1 subqueries per row, use LATERAL with unnest
  const variantsArrayParam = match.params.length === 1
    ? `ARRAY[$1]::text[]`
    : `ARRAY[${match.params.map((_, i) => `$${i + 1}`).join(',')}]::text[]`;

  const orderBy = sort === 'recent' ? 'r."publishedAt" DESC NULLS LAST' :
    sort === 'popular' ? 'r."viewsCount" DESC NULLS LAST' :
    sort === 'downloads' ? 'r."downloadsCount" DESC NULLS LAST' :
    'm.combined_score DESC';

  const searchSql = `
    WITH matched AS (
      SELECT
        r.id,
        COALESCE((SELECT MAX(ts_rank_cd(r.search_vector, websearch_to_tsquery('french', v.q)))
                  FROM unnest(${variantsArrayParam}) AS v(q)
                  WHERE r.search_vector @@ websearch_to_tsquery('french', v.q)), 0) AS fts_score,
        COALESCE((SELECT MAX(LEAST(
            word_similarity(v.q, r.title),
            word_similarity(v.q, COALESCE(r.description, ''))
          ))
          FROM unnest(${variantsArrayParam}) AS v(q)), 0) AS trgm_score
      FROM "Resource" r
      WHERE r.status = 'PUBLISHED'
        AND (${match.ftsSql} OR ${match.trgmSql})
        ${whereExtras}
    )
    SELECT
      m.id,
      m.fts_score + m.trgm_score * 0.5 AS combined_score,
      m.fts_score,
      m.trgm_score,
      ts_headline('french', r.title, websearch_to_tsquery('french', $${highlightIdx}),
        'StartSel=<mark>,StopSel=</mark>,MaxFragments=1,MaxWords=20,MinWords=5') AS title_highlighted,
      ts_headline('french', COALESCE(r.description, ''), websearch_to_tsquery('french', $${highlightIdx}),
        'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=15,MinWords=5') AS description_highlighted
    FROM matched m
    JOIN "Resource" r ON r.id = m.id
    WHERE m.fts_score + m.trgm_score * 0.5 > 0
    ORDER BY ${orderBy}
    LIMIT ${limit} OFFSET ${offset}
  `;

  // 8. Count query
  const countSql = `
    SELECT count(*)::int AS total
    FROM "Resource" r
    WHERE r.status = 'PUBLISHED'
      AND (${match.ftsSql} OR ${match.trgmSql})
      ${whereExtras}
  `;

  // 9. Facets query (parallel aggregation)
  const facetsSql = `
    WITH matched AS (
      SELECT r.type::text AS type, r."subjectId", r."classId", r."sectionId",
             r.year, r."trimester", r.language, r."hasCorrection"
      FROM "Resource" r
      WHERE r.status = 'PUBLISHED'
        AND (${match.ftsSql} OR ${match.trgmSql})
      LIMIT 5000
    ),
    type_f AS (SELECT type, count(*)::int AS c FROM matched WHERE type IS NOT NULL GROUP BY type),
    subj_f AS (SELECT "subjectId" AS k, count(*)::int AS c FROM matched WHERE "subjectId" IS NOT NULL GROUP BY "subjectId"),
    class_f AS (SELECT "classId" AS k, count(*)::int AS c FROM matched WHERE "classId" IS NOT NULL GROUP BY "classId"),
    sect_f AS (SELECT "sectionId" AS k, count(*)::int AS c FROM matched WHERE "sectionId" IS NOT NULL GROUP BY "sectionId"),
    year_f AS (SELECT year AS k, count(*)::int AS c FROM matched WHERE year IS NOT NULL GROUP BY year),
    tri_f AS (SELECT "trimester" AS k, count(*)::int AS c FROM matched WHERE "trimester" IS NOT NULL GROUP BY "trimester"),
    lang_f AS (SELECT language AS k, count(*)::int AS c FROM matched WHERE language IS NOT NULL GROUP BY language),
    corr_f AS (SELECT count(*)::int AS c FROM matched WHERE "hasCorrection" = true)
    SELECT
      (SELECT jsonb_object_agg(type, c) FROM type_f) AS type_facets,
      (SELECT jsonb_object_agg(k, c) FROM subj_f) AS subj_facets,
      (SELECT jsonb_object_agg(k, c) FROM class_f) AS class_facets,
      (SELECT jsonb_object_agg(k, c) FROM sect_f) AS sect_facets,
      (SELECT jsonb_object_agg(k, c) FROM year_f) AS year_facets,
      (SELECT jsonb_object_agg(k, c) FROM tri_f) AS tri_facets,
      (SELECT jsonb_object_agg(k, c) FROM lang_f) AS lang_facets,
      (SELECT c FROM corr_f) AS has_correction
  `;

  // 10. Execute all in parallel
  const [rawResults, countResult, facetRows] = await Promise.all([
    prisma.$queryRawUnsafe(searchSql, ...allParams) as Promise<any[]>,
    prisma.$queryRawUnsafe(countSql, ...match.params, ...filterParams) as Promise<any[]>,
    prisma.$queryRawUnsafe(facetsSql, ...match.params) as Promise<any[]>,
  ]);

  const total = countResult[0]?.total || 0;

  // 11. Hydrate
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

  const facets: SearchResponse['facets'] = {
    type: facetRows[0]?.type_facets || {},
    subjectId: facetRows[0]?.subj_facets || {},
    classId: facetRows[0]?.class_facets || {},
    sectionId: facetRows[0]?.sect_facets || {},
    year: facetRows[0]?.year_facets || {},
    trimester: facetRows[0]?.tri_facets || {},
    language: facetRows[0]?.lang_facets || {},
    hasCorrection: facetRows[0]?.has_correction || 0,
  };

  return {
    query: q,
    variants,
    expandedQuery: variants.length > 1 ? variants.join(' · ') : undefined,
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
  expandedQuery: { variants: string[]; applied: string[] };
}): SearchResponse {
  return {
    query: opts.q,
    variants: opts.expandedQuery.variants,
    expandedQuery: opts.expandedQuery.variants.length > 1 ? opts.expandedQuery.variants.join(' · ') : undefined,
    synonymsApplied: opts.expandedQuery.applied,
    page: opts.page, limit: opts.limit, total: 0, totalPages: 0,
    sort: opts.sort, durationMs: Date.now() - opts.t0, filters: opts.filters,
    results: [],
    facets: { type: {}, subjectId: {}, classId: {}, sectionId: {}, year: {}, trimester: {}, language: {}, hasCorrection: 0 },
  };
}
