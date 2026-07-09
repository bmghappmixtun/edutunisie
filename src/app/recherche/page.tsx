import { Suspense } from 'react';
import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HideOnScrollSearchBar from '@/components/search/HideOnScrollSearchBar';
import SearchResultsV2 from '@/components/search/SearchResultsV2';
import { searchV2, SearchResponse } from '@/lib/search-v2';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Search results with query params should not be indexed (avoid duplicate
// + thin content penalty). Base /recherche is indexable.
export function generateMetadata({ searchParams }: { searchParams: any }): Metadata {
  const hasQuery = !!(searchParams?.q || searchParams?.subject || searchParams?.class);
  return {
    title: 'Recherche | Examanet',
    description: 'Recherchez parmi des milliers de ressources pédagogiques gratuites : cours, devoirs, exercices, sujets de bac et corrigés. Recherche tolérante aux fautes, synonymes FR/AR inclus.',
    alternates: { canonical: '/recherche' },
    robots: hasQuery
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}

async function getInitialData(searchParams: any): Promise<{
  initialData: SearchResponse;
  options: any;
}> {
  const filters = {
    subject: getAll(searchParams.subject),
    class: getAll(searchParams.class),
    section: getAll(searchParams.section),
    type: getAll(searchParams.type),
    year: getAll(searchParams.year),
    trimester: getAll(searchParams.trimestre),
    language: getAll(searchParams.language),
    hasCorrection: searchParams.hasCorrection === 'true' ? true : undefined,
    teacherId: searchParams.teacherId || undefined,
  };

  const data = await searchV2({
    q: searchParams.q || '',
    page: parseInt(searchParams.page || '1'),
    limit: 12,
    sort: (searchParams.sort || 'relevance') as any,
    filters,
  });

  // Load filter options (subjects, classes, etc.) for the UI
  const [subjects, classes, sections, teachers, types, years, trimestres, languages] = await Promise.all([
    prisma.subject.findMany({ select: { id: true, nameFr: true, slug: true, color: true, icon: true } }),
    prisma.class.findMany({ select: { id: true, nameFr: true, slug: true } }),
    prisma.section.findMany({ select: { id: true, nameFr: true, slug: true, classId: true } }),
    prisma.user.findMany({
      where: { role: 'TEACHER', status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true },
      take: 30,
    }),
    Object.entries(data.facets.type).map(([value, count]) => ({ value, count })),
    Object.entries(data.facets.year).map(([value, count]) => ({ value, count })).sort((a, b) => b.value.localeCompare(a.value)),
    Object.entries(data.facets.trimester).map(([value, count]) => ({ value, count })),
    Object.entries(data.facets.language).map(([value, count]) => ({ value, count })),
  ]);

  return {
    initialData: data,
    options: {
      subjects: subjects.map(s => ({ id: s.id, nameFr: s.nameFr, slug: s.slug, color: s.color, icon: s.icon, count: data.facets.subjectId[s.id] || 0 })),
      classes: classes.map(c => ({ id: c.id, nameFr: c.nameFr, slug: c.slug, count: data.facets.classId[c.id] || 0 })),
      sections: sections.map(s => ({ id: s.id, nameFr: s.nameFr, slug: s.slug, classId: s.classId, count: data.facets.sectionId[s.id] || 0 })),
      teachers: teachers.map(t => ({ id: t.id, name: `${t.firstName || ''} ${t.lastName || ''}`.trim() })),
      types,
      years,
      trimestres,
      languages,
    },
  };
}

function getAll(v: any): string[] {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === 'string' && v) return [v];
  return [];
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<any> }) {
  const params = await searchParams;
  const { initialData, options } = await getInitialData(params);
  const currentQ = params.q || '';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <div className="h-20" />
      <HideOnScrollSearchBar initialQuery={currentQ} />
      <main className="flex-1 mt-6">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        }>
          <SearchResultsV2 initialData={initialData} options={options} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
