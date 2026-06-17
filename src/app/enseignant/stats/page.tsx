import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Eye, Download, Star, TrendingUp, FileText, Upload, BarChart3, ArrowLeft } from 'lucide-react';
import { formatNumber, timeAgo } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TeacherStatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');

  // Top performing resources
  const topResources = await prisma.resource.findMany({
    where: { teacherId: user.id, status: 'PUBLISHED' },
    take: 10,
    orderBy: [{ viewsCount: 'desc' }, { downloadsCount: 'desc' }],
    include: { subject: true }
  });

  // Aggregated stats per subject
  const bySubject = await prisma.resource.groupBy({
    by: ['subjectId'],
    where: { teacherId: user.id, status: 'PUBLISHED' },
    _sum: { viewsCount: true, downloadsCount: true },
    _count: { id: true },
    _avg: { avgRating: true }
  });

  // Enrich subject data
  const subjects = await prisma.subject.findMany({
    where: { id: { in: bySubject.map(b => b.subjectId) } }
  });
  const subjectMap = new Map(subjects.map(s => [s.id, s]));

  // All-time aggregates
  const totals = await prisma.resource.aggregate({
    where: { teacherId: user.id, status: 'PUBLISHED' },
    _sum: { viewsCount: true, downloadsCount: true, favoritesCount: true },
    _avg: { avgRating: true }
  });

  // Monthly views (last 6 months) – approximate via createdAt + viewCount
  const recentResources = await prisma.resource.findMany({
    where: { teacherId: user.id, status: 'PUBLISHED' },
    select: { createdAt: true, viewsCount: true, downloadsCount: true }
  });

  const monthMap = new Map<string, { views: number; downloads: number }>();
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, { views: 0, downloads: 0 });
  }
  recentResources.forEach(r => {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthMap.has(key)) {
      const entry = monthMap.get(key)!;
      entry.views += r.viewsCount;
      entry.downloads += r.downloadsCount;
    }
  });
  const monthlyData = Array.from(monthMap.entries()).map(([month, data]) => ({
    month,
    label: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
    ...data
  }));
  const maxMonthlyViews = Math.max(1, ...monthlyData.map(m => m.views));

  const totalResources = topResources.length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/enseignant" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-2xl font-extrabold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary-600" /> Statistiques</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI icon={Eye} label="Vues totales" value={formatNumber(totals._sum.viewsCount || 0)} color="from-primary-500 to-primary-600" bg="bg-primary-100" text="text-primary-600" />
        <KPI icon={Download} label="Téléchargements" value={formatNumber(totals._sum.downloadsCount || 0)} color="from-emerald-500 to-emerald-600" bg="bg-emerald-100" text="text-emerald-600" />
        <KPI icon={Star} label="Note moyenne" value={(totals._avg.avgRating || 0).toFixed(2)} suffix="/ 5" color="from-amber-500 to-amber-600" bg="bg-amber-100" text="text-amber-600" />
        <KPI icon={FileText} label="Ressources publiées" value={formatNumber(totalResources)} color="from-slate-500 to-slate-600" bg="bg-slate-100" text="text-slate-600" />
      </div>

      {/* Monthly chart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-8">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary-600" /> Activité sur 6 mois</h2>
        {monthlyData.every(m => m.views === 0 && m.downloads === 0) ? (
          <div className="py-12 text-center text-slate-400">
            <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Pas encore de données pour ces 6 derniers mois.</p>
          </div>
        ) : (
          <div className="flex items-end gap-3 h-48 mt-4">
            {monthlyData.map(m => (
              <div key={m.month} className="flex-1 flex flex-col items-center justify-end gap-1">
                <div className="text-[10px] font-bold text-slate-500">{formatNumber(m.views)}</div>
                <div
                  className="w-full bg-gradient-to-t from-primary-500 to-primary-300 rounded-t-lg transition-all"
                  style={{ height: `${Math.max(4, (m.views / maxMonthlyViews) * 100)}%` }}
                  title={`${m.views} vues`}
                />
                <div className="text-[10px] text-slate-500 font-medium">{m.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top resources */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-8">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-600" /> Top ressources</h2>
        {topResources.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Aucune ressource publiée pour l'instant.</p>
            <Link href="/enseignant/ajouter" className="btn-accent mt-4">
              <Upload className="w-4 h-4" /> Publier ma première ressource
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {topResources.map((r, i) => (
              <Link key={r.id} href={`/ressources/${r.slug}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{r.title}</div>
                  <div className="text-xs text-slate-500">{r.subject.nameFr} · {timeAgo(r.createdAt)}</div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-600 flex-shrink-0">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {formatNumber(r.viewsCount)}</span>
                  <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {formatNumber(r.downloadsCount)}</span>
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" /> {r.avgRating.toFixed(1)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* By subject */}
      {bySubject.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="font-bold text-lg mb-4">📚 Par matière</h2>
          <div className="space-y-3">
            {bySubject
              .sort((a, b) => (b._sum.viewsCount || 0) - (a._sum.viewsCount || 0))
              .map(b => {
                const subject = subjectMap.get(b.subjectId);
                if (!subject) return null;
                return (
                  <div key={b.subjectId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <div className="font-semibold text-sm">{subject.nameFr}</div>
                      <div className="text-xs text-slate-500">{b._count.id} ressource{b._count.id > 1 ? 's' : ''}</div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1 text-primary-600 font-semibold"><Eye className="w-3 h-3" /> {formatNumber(b._sum.viewsCount || 0)}</span>
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold"><Download className="w-3 h-3" /> {formatNumber(b._sum.downloadsCount || 0)}</span>
                      <span className="flex items-center gap-1 text-amber-600 font-semibold"><Star className="w-3 h-3" /> {(b._avg.avgRating || 0).toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ icon: Icon, label, value, suffix, color, bg, text }: { icon: any; label: string; value: string; suffix?: string; color: string; bg: string; text: string }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-100">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${text}`} />
      </div>
      <div className="text-2xl font-extrabold">{value}{suffix && <span className="text-base text-slate-400">{suffix}</span>}</div>
      <div className="text-sm font-semibold text-slate-700">{label}</div>
    </div>
  );
}