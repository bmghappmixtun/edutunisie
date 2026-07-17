import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HomeClient from '@/components/home/HomeClient';
import { prisma } from '@/lib/prisma';
import { getUserFavorites, decorateWithFavorites } from '@/lib/resource-helpers';

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
  const allResourceIds = await prisma.resource
    .findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true },
      take: 16,
      orderBy: [{ viewsCount: 'desc' }, { publishedAt: 'desc' }],
    })
    .then((r) => r.map((x) => x.id));
  const homeFavIds = await getUserFavorites(allResourceIds);

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
  const [resourceCount, teacherCount, studentCount, downloads] = statsArr;
  return {
    popular: JSON.parse(JSON.stringify(decorateWithFavorites(popular, homeFavIds))),
    recent: JSON.parse(JSON.stringify(decorateWithFavorites(recent, homeFavIds))),
    subjects: JSON.parse(JSON.stringify(subjects)),
    stats: {
      resources: resourceCount,
      teachers: teacherCount,
      students: studentCount,
      downloads: downloads._sum.downloadsCount || 0,
    },
  };
}

export default async function HomePage() {
  const data = await getHomeData();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <HomeClient {...data} />
      <Footer />
    </div>
  );
}
