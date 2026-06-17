import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { prisma } from '@/lib/prisma';
import { BookOpen, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SubjectsPage() {
  const subjects = await prisma.subject.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { resources: { where: { status: 'PUBLISHED' } } } } }
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        <div className="bg-gradient-to-br from-primary-50 to-sky-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-3">Toutes les <span className="gradient-text">matières</span></h1>
            <p className="text-lg text-slate-600">{subjects.length} matières · Cliquez pour explorer</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {subjects.map(s => (
              <Link key={s.id} href={`/matieres/${s.slug}`} className="card card-hover p-6 group">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition group-hover:scale-110" style={{ background: (s.color || '#0EA5E9') + '20' }}>
                  <BookOpen className="w-7 h-7" style={{ color: s.color || '#0EA5E9' }} />
                </div>
                <h3 className="font-bold text-lg mb-1 group-hover:text-primary-600 transition">{s.nameFr}</h3>
                <p className="text-sm text-slate-500">{s._count.resources} ressources</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
