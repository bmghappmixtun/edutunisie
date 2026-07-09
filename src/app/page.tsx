import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HomeClient from '@/components/home/HomeClient';
import { prisma } from '@/lib/prisma';
import { getUserFavorites, decorateWithFavorites } from '@/lib/resource-helpers';

export const metadata: Metadata = {
  title: 'Examanet — Cours, devoirs, exercices et corrigés gratuits en Tunisie',
  description: 'Plateforme pédagogique tunisienne #1 : cours, devoirs, exercices, sujets de bac et corrigés pour le Primaire, Collège et Lycée. 100% gratuit.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Examanet — La plateforme pédagogique #1 en Tunisie',
    description: '15 000+ ressources gratuites : cours, devoirs, séries, révisions, sujets bac et corrigés.',
    url: '/',
    type: 'website',
  },
};

export const revalidate = 300; // 5 min cache

async function getHomeData() {
  const allResourceIds = await prisma.resource.findMany({ where: { status: 'PUBLISHED' }, select: { id: true }, take: 16, orderBy: [{ viewsCount: 'desc' }, { publishedAt: 'desc' }] }).then(r => r.map(x => x.id));
  const homeFavIds = await getUserFavorites(allResourceIds);

  const [popular, recent, statsArr, subjects] = await Promise.all([
    prisma.resource.findMany({
      where: { status: 'PUBLISHED' },
      take: 8,
      orderBy: [{ viewsCount: 'desc' }, { publishedAt: 'desc' }],
      include: { subject: true, class: true, teacher: { select: { firstName: true, lastName: true, firstNameAr: true, lastNameAr: true } },}
    }),
    prisma.resource.findMany({
      where: { status: 'PUBLISHED' },
      take: 8,
      orderBy: { publishedAt: 'desc' },
      include: { subject: true, class: true, teacher: { select: { firstName: true, lastName: true, firstNameAr: true, lastNameAr: true } },}
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
    }
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