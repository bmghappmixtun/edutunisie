import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SearchBar from '@/components/search/SearchBar';
import SearchResults from '@/components/search/SearchResults';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Recherche — EduTunisie',
  description: 'Recherchez parmi des milliers de ressources pédagogiques gratuites : cours, devoirs, exercices, sujets de bac et corrigés.'
};

async function getInitialData(searchParams: any) {
  const q = searchParams.q || '';
  const subjectId = searchParams.subject || '';
  const classId = searchParams.class || '';
  const teacherId = searchParams.teacher || '';
  const type = searchParams.type || '';
  const year = searchParams.year || '';
  const sort = searchParams.sort || 'recent';
  const page = parseInt(searchParams.page || '1');
  const limit = 12;

  // Build where
  const where: any = { status: 'PUBLISHED' };
  if (subjectId) where.subjectId = subjectId;
  if (classId) where.classId = classId;
  if (teacherId) where.teacherId = teacherId;
  if (type) where.type = type;
  if (year) where.year = parseInt(year);

  const orderBy: any =
    sort === 'popular' ? { viewsCount: 'desc' } :
    sort === 'downloads' ? { downloadsCount: 'desc' } :
    { publishedAt: 'desc' };

  const [results, total, subjects, classes, teachers, types, years, subjectFacets, classFacets, typeFacets, yearFacets, teacherFacets] = await Promise.all([
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
    prisma.resource.count({ where }),
    prisma.subject.findMany({ orderBy: { order: 'asc' }, select: { id: true, nameFr: true, icon: true } }),
    prisma.class.findMany({ orderBy: { order: 'asc' }, select: { id: true, nameFr: true } }),
    prisma.user.findMany({
      where: { role: 'TEACHER', status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true },
      take: 30
    }),
    prisma.resource.groupBy({ by: ['type'], where: { status: 'PUBLISHED' }, _count: { _all: true } }),
    prisma.resource.groupBy({
      by: ['year'],
      where: { status: 'PUBLISHED', year: { not: null } },
      _count: { _all: true },
      orderBy: { year: 'desc' }
    }),
    prisma.resource.groupBy({ by: ['subjectId'], where: { status: 'PUBLISHED' }, _count: { _all: true } }),
    prisma.resource.groupBy({ by: ['classId'], where: { status: 'PUBLISHED', classId: { not: null } }, _count: { _all: true } }),
    prisma.resource.groupBy({ by: ['type'], where: { status: 'PUBLISHED' }, _count: { _all: true } }),
    prisma.resource.groupBy({ by: ['year'], where: { status: 'PUBLISHED', year: { not: null } }, _count: { _all: true } }),
    prisma.resource.groupBy({
      by: ['teacherId'],
      where: { status: 'PUBLISHED' },
      _count: { _all: true },
      orderBy: { _count: { teacherId: 'desc' } },
      take: 20
    })
  ]);

  return {
    initialData: {
      results: JSON.parse(JSON.stringify(results)),
      total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
      sort,
      took: 0
    },
    initialFacets: {
      subjects: subjectFacets.map((s: any) => ({ id: s.subjectId, count: s._count._all })),
      classes: classFacets.map((c: any) => ({ id: c.classId, count: c._count._all })),
      teachers: teacherFacets.map((t: any) => ({ id: t.teacherId, count: t._count._all })),
      types: typeFacets.map((t: any) => ({ value: t.type, count: t._count._all })),
      years: yearFacets.map((y: any) => ({ value: y.year, count: y._count._all }))
    },
    initialOptions: {
      subjects: subjects.filter((s: any) => subjectFacets.some((f: any) => f.subjectId === s.id && f._count._all > 0)),
      classes: classes.filter((c: any) => classFacets.some((f: any) => f.classId === c.id && f._count._all > 0)),
      teachers: teachers.filter((t: any) => teacherFacets.some((f: any) => f.teacherId === t.id && f._count._all > 0))
        .map((t: any) => ({ id: t.id, name: `${t.firstName} ${t.lastName}` })),
      types,
      years
    }
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<any> }) {
  const params = await searchParams;
  const { initialData, initialFacets, initialOptions } = await getInitialData(params);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      {/* Search bar at top */}
      <div className="bg-white border-b border-slate-200 pt-20 pb-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SearchBar size="lg" />
        </div>
      </div>

      <main className="flex-1">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        }>
          <SearchResults
            initialData={initialData}
            initialFacets={initialFacets}
            initialOptions={initialOptions}
          />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}