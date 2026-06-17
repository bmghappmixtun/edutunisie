import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { prisma } from '@/lib/prisma';
import { GraduationCap, BookOpen, ArrowRight, Baby, Library } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NiveauxPage() {
  const levels = await prisma.level.findMany({
    orderBy: { order: 'asc' },
    include: {
      classes: {
        orderBy: { order: 'asc' },
        include: { _count: { select: { resources: { where: { status: 'PUBLISHED' } } } } }
      }
    }
  });

  const levelEmojis: Record<string, string> = { primaire: '🎒', college: '📖', lycee: '🎓' };
  const levelGradients: Record<string, string> = {
    primaire: 'from-emerald-50 to-green-50 border-emerald-200',
    college: 'from-primary-50 to-sky-50 border-primary-200',
    lycee: 'from-amber-50 to-orange-50 border-amber-200',
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        <div className="bg-gradient-to-br from-primary-50 to-sky-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-3">Tous les <span className="gradient-text">niveaux scolaires</span></h1>
            <p className="text-lg text-slate-600">Explorez les ressources par niveau et classe</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          {levels.map(level => (
            <section key={level.id}>
              <div className={`bg-gradient-to-br ${levelGradients[level.slug] || 'from-slate-50 to-slate-100 border-slate-200'} rounded-3xl p-6 lg:p-8 border-2`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-5xl">{levelEmojis[level.slug] || '📚'}</div>
                  <div className="flex-1">
                    <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900">{level.nameFr}</h2>
                    <p className="text-slate-600">{level.classes.length} classes · {level.classes.reduce((s, c) => s + c._count.resources, 0)} ressources</p>
                  </div>
                  <Link href={`/niveaux/${level.slug}`} className="hidden sm:inline-flex items-center gap-2 text-primary-600 font-semibold hover:gap-3 transition-all">
                    Tout voir <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {level.classes.map(cls => (
                    <Link key={cls.id} href={`/ressources?class=${cls.slug}`} className="bg-white rounded-xl p-4 border border-slate-100 hover:border-primary-300 hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-primary-600 transition">{cls.nameFr}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{cls._count.resources} ressources</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-600 group-hover:translate-x-1 transition" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
