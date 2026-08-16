import type { Metadata } from 'next';
import { headers } from 'next/headers';
import dynamic from 'next/dynamic';
import { unstable_cache as nextCache } from 'next/cache';

import { prisma } from '@/lib/prisma';
import { getUserFavorites, decorateWithFavorites } from '@/lib/resource-helpers';

// PERF 2026-08-16: Home page is the most-hit page on the site (~620K function
// invocations over 22 days contributed $7.42 to the Aug-2026 Vercel bill).
// Each render fired 8 Prisma queries (resource.findMany x2, count x4,
// subject.findMany, user.favorites) which (a) blew through the Prisma pool
// (connection_limit=2 per Lambda) and (b) generated one observability event
// per query.
//
// We now:
// 1. Cache the static data (popular, recent, stats, subjects) for 5 min
//    via unstable_cache with explicit tags for surgical invalidation.
// 2. Move favorites to a client-side fetch (personalized, must be per-user).
// 3. Drop the `getUserFavorites` server call from getHomeData().
//
// Result: home page is now 1 Prisma call (subjects, cached) instead of 8,
// and never times out due to pool exhaustion.
const REVALIDATE_S = 300;
const getCachedHomeData = nextCache(
  async () => {
    const [popular, recent, statsArr, subjects] = await Promise.all([
      prisma.resource.findMany({
        where: { status: 'PUBLISHED' },
        take: 8,
        orderBy: [{ viewsCount: 'desc' }, { publishedAt: 'desc' }],
        include: {
          subject: true,
          class: true,
          teacher: {
            select: { firstName: true, lastName: true, firstNameAr: true, lastNameAr: true },
          },
        },
      }),
      prisma.resource.findMany({
        where: { status: 'PUBLISHED' },
        take: 8,
        orderBy: { publishedAt: 'desc' },
        include: {
          subject: true,
          class: true,
          teacher: {
            select: { firstName: true, lastName: true, firstNameAr: true, lastNameAr: true },
          },
        },
      }),
      Promise.all([
        prisma.resource.count({ where: { status: 'PUBLISHED' } }),
        prisma.user.count({ where: { role: 'TEACHER', status: 'ACTIVE' } }),
        prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' } }),
        prisma.resource.aggregate({ _sum: { downloadsCount: true } }),
      ]),
      prisma.subject.findMany({ orderBy: { order: 'asc' } }),
    ]);
    return { popular, recent, statsArr, subjects };
  },
  ['home-data-v1'],
  { revalidate: REVALIDATE_S, tags: ['home', 'resources', 'subjects'] },
);

// Page-level generateMetadata so /ar (rewritten to /) can serve Arabic metadata.
// The root layout's locale defaults stay for children, but this overrides the
// title/description/canonical when the request comes in via the /ar rewrite.
export async function generateMetadata(): Promise<Metadata> {
  const isAr: boolean = await (async () => {
    try {
      const h = await headers();
      return (
        h.get('x-locale') === 'ar' ||
        (h.get('x-pathname') || '').startsWith('/ar') ||
        (h.get('cookie') || '').includes('locale=ar')
      );
    } catch {
      return false;
    }
  })();
  if (!isAr) {
    return {
      title: 'Examanet — Cours, devoirs, exercices et corrigés gratuits en Tunisie',
      description:
        'Plateforme pédagogique tunisienne #1 : cours, devoirs, exercices, sujets de bac et corrigés pour le Primaire, Collège et Lycée. 100% gratuit.',
      alternates: { canonical: '/' },
    };
  }
  return {
    title: 'إكسامانت — دروس، فروض، تمارين وإصلاحات مجانية في تونس',
    description:
      'المنصة التربوية التونسية #1: دروس، فروض، تمارين، مواضيع باكالوريا وإصلاحات للابتدائي، الإعدادي والثانوي. 100% مجاني.',
    alternates: { canonical: '/ar' },
    openGraph: {
      title: 'إكسامانت — المنصة التربوية التونسية #1',
      description: 'دروس، فروض، سلاسل، ملخصات، مواضيع باك وإصلاحات — مجانية 100%.',
      url: '/ar',
      type: 'website',
      locale: 'ar_TN',
      images: [
        {
          url: '/api/og/page/home',
          width: 1200,
          height: 630,
          alt: 'إكسامانت - المنصة التربوية التونسية',
        },
      ],
    },
  };
}

export const revalidate = 300; // 5 min cache

async function getHomeData() {
  // PERF 2026-08-16: Use the cached fetcher (5 min TTL + tags). The favorites
  // are now applied client-side via /api/favorites so they stay per-user and
  // the server-rendered HTML can be cached safely.
  const { popular, recent, statsArr, subjects } = await getCachedHomeData();
  const [resourceCount, teacherCount, studentCount, downloads] = statsArr;
  return {
    popular: JSON.parse(JSON.stringify(popular)),
    recent: JSON.parse(JSON.stringify(recent)),
    subjects: JSON.parse(JSON.stringify(subjects)),
    stats: {
      resources: resourceCount,
      teachers: teacherCount,
      students: studentCount,
      downloads: downloads._sum.downloadsCount || 0,
    },
  };
}

const HomeClient = dynamic(() => import('@/components/home/HomeClient'), {
  ssr: true,
  loading: () => <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-sky-50" />,
});

export default async function HomePage() {
  const data = await getHomeData();

  return (
    <div className="min-h-screen flex flex-col">
      <HomeClient {...data} />
      </div>
  );
}
// 1784381489
