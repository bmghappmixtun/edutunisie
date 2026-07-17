import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import CatalogAdminClient from '@/components/admin/CatalogAdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminCatalogPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');
  if (user.role !== 'ADMIN') redirect('/');

  // Fetch all catalog data
  const [subjects, levels, classes, sections] = await Promise.all([
    prisma.subject.findMany({
      orderBy: { nameFr: 'asc' },
      include: { _count: { select: { resources: true } } },
    }),
    prisma.level.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { classes: true } } },
    }),
    prisma.class.findMany({
      orderBy: [{ level: { order: 'asc' } }, { order: 'asc' }],
      include: {
        level: { select: { nameFr: true, slug: true } },
        _count: { select: { resources: true, sections: true } },
      },
    }),
    prisma.section.findMany({
      orderBy: [{ class: { order: 'asc' } }, { nameFr: 'asc' }],
      include: {
        class: { select: { nameFr: true, slug: true } },
        _count: { select: { resources: true } },
      },
    }),
  ]);

  return (
    <CatalogAdminClient
      initialData={{
        subjects: JSON.parse(JSON.stringify(subjects)),
        levels: JSON.parse(JSON.stringify(levels)),
        classes: JSON.parse(JSON.stringify(classes)),
        sections: JSON.parse(JSON.stringify(sections)),
      }}
    />
  );
}
