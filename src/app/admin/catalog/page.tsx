import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import CatalogAdminClient from '@/components/admin/CatalogAdminClient';
import AdminCatalogIndex from '@/components/admin/AdminCatalogIndex';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Catalogue — Examanet Admin',
};

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
    <>
      {/* Hero header with quick stats */}
      <AdminCatalogIndex
        stats={{
          subjects: subjects.length,
          levels: levels.length,
          classes: classes.length,
          sections: sections.length,
        }}
      />

      {/* Main CRUD editor */}
      <CatalogAdminClient
        initialData={{
          subjects: JSON.parse(JSON.stringify(subjects)),
          levels: JSON.parse(JSON.stringify(levels)),
          classes: JSON.parse(JSON.stringify(classes)),
          sections: JSON.parse(JSON.stringify(sections)),
        }}
      />
    </>
  );
}
