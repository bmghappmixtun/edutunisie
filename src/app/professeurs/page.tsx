import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { prisma } from '@/lib/prisma';
import { GraduationCap, MapPin, BookOpen, FileText, Star } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TeachersPage() {
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER', status: 'ACTIVE', isVerifiedTeacher: true },
    select: {
      id: true, firstName: true, lastName: true, avatarUrl: true, bio: true,
      schoolName: true, governorate: true,
      _count: { select: { uploadedFiles: { where: { status: 'PUBLISHED' } } } }
    }
  });

  const teachersWithStats = await Promise.all(teachers.map(async t => {
    const files = await prisma.resource.findMany({
      where: { teacherId: t.id, status: 'PUBLISHED' },
      select: { viewsCount: true, downloadsCount: true, avgRating: true }
    });
    return {
      ...t,
      totalViews: files.reduce((s, f) => s + f.viewsCount, 0),
      totalDownloads: files.reduce((s, f) => s + f.downloadsCount, 0),
      avgRating: files.length ? files.reduce((s, f) => s + f.avgRating, 0) / files.length : 0,
    };
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-3">Nos <span className="gradient-text">professeurs</span></h1>
            <p className="text-lg text-slate-600">{teachers.length} enseignants certifiés · Cliquez pour voir leurs ressources</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {teachersWithStats.map(t => (
              <Link key={t.id} href={`/professeurs/${t.id}`} className="card card-hover p-6 group">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white font-extrabold text-xl flex items-center justify-center flex-shrink-0">
                    {t.firstName?.[0]}{t.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg group-hover:text-primary-600 transition truncate">{t.firstName} {t.lastName}</h3>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold flex-shrink-0">✓</span>
                    </div>
                    {t.schoolName && <p className="text-sm text-slate-500 truncate">{t.schoolName}</p>}
                    {t.governorate && <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.governorate}</p>}
                  </div>
                </div>
                {t.bio && <p className="text-sm text-slate-600 mt-3 line-clamp-2">{t.bio}</p>}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
                  <div className="text-center">
                    <div className="text-lg font-extrabold">{t._count.uploadedFiles}</div>
                    <div className="text-xs text-slate-500">Fichiers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-extrabold">{t.totalDownloads > 999 ? (t.totalDownloads / 1000).toFixed(1) + 'k' : t.totalDownloads}</div>
                    <div className="text-xs text-slate-500">Téléch.</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-extrabold flex items-center justify-center gap-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {t.avgRating.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-500">Note</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
