import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HomeClient from '@/components/home/HomeClient';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function getHomeData() {
  const [popular, recent, statsArr, subjects] = await Promise.all([
    prisma.resource.findMany({
      where: { status: 'PUBLISHED' },
      take: 8,
      orderBy: [{ viewsCount: 'desc' }, { publishedAt: 'desc' }],
      include: { subject: true, class: true, teacher: { select: { firstName: true, lastName: true } } }
    }),
    prisma.resource.findMany({
      where: { status: 'PUBLISHED' },
      take: 8,
      orderBy: { publishedAt: 'desc' },
      include: { subject: true, class: true, teacher: { select: { firstName: true, lastName: true } } }
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
    popular: JSON.parse(JSON.stringify(popular)),
    recent: JSON.parse(JSON.stringify(recent)),
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