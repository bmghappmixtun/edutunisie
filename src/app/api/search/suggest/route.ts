import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUGGEST_TYPES = ['resource', 'teacher', 'subject', 'class', 'section'] as const;
type SuggestType = (typeof SUGGEST_TYPES)[number];

// Suggest results structure
interface SuggestResult {
  type: SuggestType;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  icon?: string;
}

// Get current user (for personalized results)
async function getCurrentUser() {
  try {
    const { getCurrentUser: getUser } = await import('@/lib/auth');
    return await getUser();
  } catch {
    return null;
  }
}

// Search resources with full-text + trigram
async function searchResources(q: string, limit: number): Promise<SuggestResult[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  // Use websearch_to_tsquery for natural language (handles typos, multiple words)
  // Fall back to plainto_tsquery if websearch not available
  const results = await prisma.$queryRaw<any[]>`
    SELECT 
      r.id, r."numericId", r.title, r.slug, r.type,
      s."nameFr" as "subjectName",
      c."nameFr" as "className",
      ts_rank(r.search_vector, websearch_to_tsquery('french', ${trimmed})) as rank,
      similarity(unaccent(r.title), unaccent(${trimmed})) as sim
    FROM "Resource" r
    LEFT JOIN "Subject" s ON r."subjectId" = s.id
    LEFT JOIN "Class" c ON r."classId" = c.id
    WHERE r.status = 'PUBLISHED'
      AND (
        r.search_vector @@ websearch_to_tsquery('french', ${trimmed})
        OR unaccent(r.title) % unaccent(${trimmed})
        OR unaccent(r.title) ILIKE ${'%' + trimmed + '%'}
      )
    ORDER BY rank DESC, sim DESC, r."publishedAt" DESC NULLS LAST
    LIMIT ${limit}
  `;

  return (results as any[]).map((r) => ({
    type: 'resource' as SuggestType,
    id: r.id,
    title: r.title,
    subtitle: [r.subjectName, r.className, typeLabel(r.type)].filter(Boolean).join(' · '),
    href: `/ressources/${r.numericId}/${r.slug}`,
    icon: typeIcon(r.type),
  }));
}

// Search teachers
async function searchTeachers(q: string, limit: number): Promise<SuggestResult[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const results = await prisma.$queryRaw<any[]>`
    SELECT 
      u.id, u."numericId", u."slug", u."firstName", u."lastName", u."schoolName", u."avatarUrl",
      (SELECT COUNT(*) FROM "Resource" r WHERE r."teacherId" = u.id AND r.status = 'PUBLISHED')::int as "resourceCount"
    FROM "User" u
    WHERE u.role = 'TEACHER' AND u.status = 'ACTIVE'
      AND (
        unaccent(u."firstName" || ' ' || u."lastName") ILIKE unaccent(${`%${trimmed}%`})
        OR unaccent(COALESCE(u."schoolName", '')) ILIKE unaccent(${`%${trimmed}%`})
      )
    ORDER BY "resourceCount" DESC
    LIMIT ${limit}
  `;

  return (results as any[]).map((u) => ({
    type: 'teacher' as SuggestType,
    id: u.id,
    title: `${u.firstName || ''} ${u.lastName || ''}`,
    subtitle: [u.schoolName, `${u.resourceCount} ressource(s)`].filter(Boolean).join(' · '),
    href: `/professeurs/${u.numericId}/${u.slug}`,
    icon: '👨‍🏫',
  }));
}

// Search subjects
async function searchSubjects(q: string, limit: number): Promise<SuggestResult[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const results = await prisma.$queryRaw<any[]>`
    SELECT 
      s.id, s.slug, s."nameFr", s."nameAr", s.icon, s.color,
      (SELECT COUNT(*) FROM "Resource" r WHERE r."subjectId" = s.id AND r.status = 'PUBLISHED')::int as "resourceCount"
    FROM "Subject" s
    WHERE unaccent(s."nameFr") ILIKE unaccent(${`%${trimmed}%`})
       OR unaccent(COALESCE(s."nameAr", '')) ILIKE unaccent(${`%${trimmed}%`})
    ORDER BY "resourceCount" DESC
    LIMIT ${limit}
  `;

  return (results as any[]).map((s) => ({
    type: 'subject' as SuggestType,
    id: s.id,
    title: s.nameFr,
    subtitle: `${s.resourceCount} ressource(s)`,
    href: `/matieres/${s.slug}`,
    icon: s.icon || '📚',
  }));
}

// Search classes
async function searchClasses(q: string, limit: number): Promise<SuggestResult[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const results = await prisma.$queryRaw<any[]>`
    SELECT 
      c.id, c.slug, c."nameFr", c."nameAr",
      l.slug as "levelSlug", l."nameFr" as "levelName",
      (SELECT COUNT(*) FROM "Resource" r WHERE r."classId" = c.id AND r.status = 'PUBLISHED')::int as "resourceCount"
    FROM "Class" c
    LEFT JOIN "Level" l ON c."levelId" = l.id
    WHERE unaccent(c."nameFr") ILIKE unaccent(${`%${trimmed}%`})
       OR unaccent(COALESCE(c."nameAr", '')) ILIKE unaccent(${`%${trimmed}%`})
    ORDER BY c."order" ASC
    LIMIT ${limit}
  `;

  return (results as any[]).map((c) => ({
    type: 'class' as SuggestType,
    id: c.id,
    title: c.nameFr,
    subtitle: [c.levelName, `${c.resourceCount} ressource(s)`].filter(Boolean).join(' · '),
    href: `/niveaux/${c.levelSlug}#${c.slug}`,
    icon: '🎒',
  }));
}

// Sections
async function searchSections(q: string, limit: number): Promise<SuggestResult[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const results = await prisma.$queryRaw<any[]>`
    SELECT 
      s.id, s.slug, s."nameFr", s."nameAr",
      c.slug as "classSlug", c."nameFr" as "className",
      l.slug as "levelSlug",
      (SELECT COUNT(*) FROM "Resource" r WHERE r."sectionId" = s.id AND r.status = 'PUBLISHED')::int as "resourceCount"
    FROM "Section" s
    LEFT JOIN "Class" c ON s."classId" = c.id
    LEFT JOIN "Level" l ON c."levelId" = l.id
    WHERE unaccent(s."nameFr") ILIKE unaccent(${`%${trimmed}%`})
       OR unaccent(COALESCE(s."nameAr", '')) ILIKE unaccent(${`%${trimmed}%`})
    LIMIT ${limit}
  `;

  return (results as any[]).map((s) => ({
    type: 'section' as SuggestType,
    id: s.id,
    title: s.nameFr,
    subtitle: [s.className, `${s.resourceCount} ressource(s)`].filter(Boolean).join(' · '),
    href: `/niveaux/${s.levelSlug}#${s.classSlug}`,
    icon: '📁',
  }));
}

// Helpers
function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    COURSE: 'Cours',
    HOMEWORK: 'Devoir',
    EXERCISE: 'Exercice',
    SERIES: 'Série',
    BAC_SUBJECT: 'Sujet Bac',
    CORRECTION: 'Corrigé',
    SUMMARY: 'Résumé',
    CARD: 'Fiche',
  };
  return labels[type] || type;
}

function typeIcon(type: string): string {
  const icons: Record<string, string> = {
    COURSE: '📖',
    HOMEWORK: '📝',
    EXERCISE: '✏️',
    SERIES: '📚',
    BAC_SUBJECT: '🎓',
    CORRECTION: '✅',
    SUMMARY: '📄',
    CARD: '🗂️',
  };
  return icons[type] || '📄';
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  const q = req.nextUrl.searchParams.get('q') || '';
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '8'), 20);
  const types = (req.nextUrl.searchParams.get('types') || 'resource,teacher,subject,class')
    .split(',')
    .filter((t) => SUGGEST_TYPES.includes(t as SuggestType)) as SuggestType[];

  if (!q.trim() || q.length < 2) {
    return NextResponse.json({
      query: q,
      results: [],
      groups: {},
      took: Date.now() - start,
    });
  }

  // Run all searches in parallel
  const [resources, teachers, subjects, classes, sections] = await Promise.all([
    types.includes('resource') ? searchResources(q, limit) : Promise.resolve([]),
    types.includes('teacher') ? searchTeachers(q, 3) : Promise.resolve([]),
    types.includes('subject') ? searchSubjects(q, 3) : Promise.resolve([]),
    types.includes('class') ? searchClasses(q, 3) : Promise.resolve([]),
    types.includes('section') ? searchSections(q, 2) : Promise.resolve([]),
  ]);

  // Combine all results
  const all = [...resources, ...teachers, ...subjects, ...classes, ...sections];

  // Group by type
  const groups: Record<string, SuggestResult[]> = {
    resource: resources,
    teacher: teachers,
    subject: subjects,
    class: classes,
    section: sections,
  };

  return NextResponse.json({
    query: q,
    results: all.slice(0, limit * 2),
    groups,
    counts: {
      resource: resources.length,
      teacher: teachers.length,
      subject: subjects.length,
      class: classes.length,
      section: sections.length,
      total: all.length,
    },
    took: Date.now() - start,
  });
}
