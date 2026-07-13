import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import TeacherLibraryClient from '@/components/teacher/TeacherLibraryClient';

export const metadata: Metadata = {
  title: 'Ma bibliothèque — Examanet',
  description: 'Vos fichiers originaux (.docx, .pdf) sauvegardés pour réutilisation future',
};

export const dynamic = 'force-dynamic';

export default async function TeacherLibraryPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
    redirect('/');
  }

  // Pre-fetch filter options (classes, subjects)
  const [classes, subjects] = await Promise.all([
    prisma.class.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, nameFr: true, nameAr: true, slug: true, },
    }),
    prisma.subject.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, nameFr: true, nameAr: true, slug: true, color: true, icon: true },
    }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          📚 Ma bibliothèque
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Tous vos fichiers originaux (Word, PDF) sont sauvegardés ici. Vous pouvez les
          télécharger à tout moment et les réutiliser pour publier de nouvelles ressources.
        </p>
      </div>
      <TeacherLibraryClient classes={classes} subjects={subjects} />
    </div>
  );
}