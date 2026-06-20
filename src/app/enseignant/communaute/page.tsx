import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import CommunityClient from '@/components/teacher/CommunityClient';

export const metadata: Metadata = {
  title: 'Communauté enseignants — Examanet',
  description:
    "Partage entre enseignants : téléchargez les fichiers Office originaux (.docx) des autres professeurs pour préparer vos ressources. Unique en Tunisie.",
};

export const dynamic = 'force-dynamic';

export default async function TeacherCommunityPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
    redirect('/');
  }

  // Pre-fetch filter options
  const [classes, subjects] = await Promise.all([
    prisma.class.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, nameFr: true, nameAr: true, slug: true },
    }),
    prisma.subject.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, nameFr: true, nameAr: true, slug: true, color: true, icon: true },
    }),
  ]);

  // Count stats (for the page header)
  const [totalShared, totalTeachers] = await Promise.all([
    prisma.teacherFile.count({
      where: {
        pdfUrl: { not: null },
        conversionStatus: 'SUCCESS',
        teacherId: { not: user.id },
      },
    }),
    prisma.user.count({ where: { role: 'TEACHER' } }),
  ]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-500 to-primary p-6 text-white shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_60%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold mb-3">
            <span>👨‍🏫</span> ESPACE EXCLUSIF ENSEIGNANTS
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold mb-2">
            Communauté des enseignants
          </h1>
          <p className="text-white/90 max-w-2xl">
            <strong>Unique en Tunisie</strong> : téléchargez les fichiers Office originaux
            (.docx, .doc) partagés par les autres enseignants pour préparer vos propres
            ressources. Modifiez, adaptez, réutilisez.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{totalShared}</span>
              <span className="text-white/80">fichiers partagés</span>
            </div>
            <div className="w-px h-6 bg-white/30" />
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{totalTeachers}</span>
              <span className="text-white/80">enseignants actifs</span>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="text-3xl mb-2">🔍</div>
          <h3 className="font-bold text-slate-900 dark:text-white mb-1">1. Explorez</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Parcourez les ressources des autres enseignants par matière, classe ou type.
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="text-3xl mb-2">⬇️</div>
          <h3 className="font-bold text-slate-900 dark:text-white mb-1">2. Téléchargez</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Récupérez le fichier Office original (.docx) en un clic pour le modifier.
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="text-3xl mb-2">✏️</div>
          <h3 className="font-bold text-slate-900 dark:text-white mb-1">3. Réutilisez</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Adaptez à votre classe, modifiez, et republiez. Gagnez des heures de travail.
          </p>
        </div>
      </div>

      <CommunityClient classes={classes} subjects={subjects} />
    </div>
  );
}