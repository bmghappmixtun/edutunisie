import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ResourceCard from '@/components/resources/ResourceCard';
import { prisma } from '@/lib/prisma';
import { ChevronRight, BookOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ subject: string }> }) {
  const { subject: subjectSlug } = await params;
  const subject = await prisma.subject.findUnique({
    where: { slug: subjectSlug },
    select: { nameFr: true, nameAr: true, slug: true },
  });
  if (!subject) return { title: 'Matière non trouvée' };
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
  return {
    title: `${subject.nameFr} — Cours, Devoirs et Exercices gratuits`,
    description: `Ressources pédagogiques gratuites en ${subject.nameFr} pour les élèves tunisiens : cours, devoirs, séries d'exercices, sujets bac et corrigés.`,
    alternates: { canonical: `${baseUrl}/matieres/${subject.slug}` },
    openGraph: {
      title: `${subject.nameFr} — Examanet`,
      description: `Cours, devoirs et exercices gratuits en ${subject.nameFr}.`,
      url: `${baseUrl}/matieres/${subject.slug}`,
      locale: 'fr_TN',
      type: 'website',
    },
  };
}

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject: subjectSlug } = await params;
  const subject = await prisma.subject.findUnique({ where: { slug: subjectSlug } });
  if (!subject) return <div className="min-h-screen flex items-center justify-center"><h1 className="text-2xl font-bold">Matière non trouvée</h1></div>;

  const resources = await prisma.resource.findMany({
    where: { subjectId: subject.id, status: 'PUBLISHED' },
    take: 24,
    orderBy: { publishedAt: 'desc' },
    include: { subject: true, class: true, teacher: { select: { firstName: true, lastName: true } } }
  });

  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER', status: 'ACTIVE', isVerifiedTeacher: true },
    select: {
      id: true, firstName: true, lastName: true, avatarUrl: true, bio: true, schoolName: true,
      teachingSubjects: true,
      _count: { select: { uploadedFiles: { where: { subjectId: subject.id, status: 'PUBLISHED' } } } }
    }
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        <div className="bg-gradient-to-br from-slate-50 to-primary-50 py-12" style={{ borderTop: `4px solid ${subject.color || '#0EA5E9'}` }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
              <Link href="/" className="hover:text-primary-600">Accueil</Link>
              <ChevronRight className="w-4 h-4" />
              <Link href="/matieres" className="hover:text-primary-600">Matières</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-slate-900 font-semibold">{subject.nameFr}</span>
            </nav>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: (subject.color || '#0EA5E9') + '20' }}>
                <BookOpen className="w-8 h-8" style={{ color: subject.color || '#0EA5E9' }} />
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-extrabold mb-1">{subject.nameFr}</h1>
                <p className="text-lg text-slate-600">{resources.length} ressources disponibles</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {resources.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {resources.map(r => <ResourceCard key={r.id} resource={r as any} />)}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
              <div className="text-5xl mb-3">📖</div>
              <h3 className="font-bold text-xl mb-2">Aucune ressource pour le moment</h3>
              <p className="text-slate-500">Revenez bientôt !</p>
            </div>
          )}

          {teachers.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-4">Professeurs de {subject.nameFr}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {teachers.filter(t => t.teachingSubjects?.includes(subject.slug)).map(t => (
                  <Link key={t.id} href={`/professeurs/${t.id}`} className="card card-hover p-5 flex gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white font-bold flex items-center justify-center flex-shrink-0">
                      {t.firstName?.[0]}{t.lastName?.[0]}
                    </div>
                    <div>
                      <div className="font-bold">{t.firstName} {t.lastName}</div>
                      <div className="text-xs text-slate-500">{t.schoolName}</div>
                      <div className="text-xs text-primary-600 mt-1">{t._count.uploadedFiles} ressources</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
