import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { BarChart3, TrendingUp, Users, FileText, Eye, Download, Heart, Star, Globe, Calendar } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TeacherAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
    redirect('/mon-compte');
  }

  // Get all resources by this teacher
  const resources = await prisma.resource.findMany({
    where: { teacherId: user.id, status: 'PUBLISHED' },
    select: {
      id: true, title: true, slug: true, type: true,
      viewsCount: true, downloadsCount: true, favoritesCount: true, avgRating: true,
      createdAt: true,
      _count: { select: { comments: true, ratings: true } }
    },
    orderBy: { viewsCount: 'desc' }
  });

  // Aggregate stats
  const totalViews = resources.reduce((s, r) => s + r.viewsCount, 0);
  const totalDownloads = resources.reduce((s, r) => s + r.downloadsCount, 0);
  const totalFavorites = resources.reduce((s, r) => s + r.favoritesCount, 0);
  const totalComments = resources.reduce((s, r) => s + r._count.comments, 0);
  const avgRating = resources.filter(r => r.avgRating > 0).length
    ? resources.filter(r => r.avgRating > 0).reduce((s, r) => s + r.avgRating, 0) / resources.filter(r => r.avgRating > 0).length
    : 0;

  // Views by day (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const viewsRecent = await prisma.view.findMany({
    where: {
      resource: { teacherId: user.id },
      createdAt: { gte: thirtyDaysAgo }
    },
    select: { createdAt: true }
  });

  // Group by day
  const viewsByDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    viewsByDay[key] = 0;
  }
  for (const v of viewsRecent) {
    const key = v.createdAt.toISOString().slice(0, 10);
    if (key in viewsByDay) viewsByDay[key]++;
  }
  const maxDayViews = Math.max(...Object.values(viewsByDay), 1);

  // Top countries (no country field available, so use empty)
  const topCountries: [string, number][] = [];

  // Followers
  const followersCount = await prisma.follow.count({ where: { followingId: user.id } });

  // Top 5 resources
  const topResources = resources.slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6 flex items-center gap-2">
        <BarChart3 className="w-7 h-7 text-primary-500" />
        Mes statistiques
      </h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPICard
          icon={<FileText className="w-5 h-5" />}
          label="Ressources"
          value={resources.length.toString()}
          color="bg-primary-50 text-primary-600"
        />
        <KPICard
          icon={<Eye className="w-5 h-5" />}
          label="Vues totales"
          value={totalViews.toLocaleString('fr-FR')}
          color="bg-blue-50 text-blue-600"
        />
        <KPICard
          icon={<Download className="w-5 h-5" />}
          label="Téléchargements"
          value={totalDownloads.toLocaleString('fr-FR')}
          color="bg-emerald-50 text-emerald-600"
        />
        <KPICard
          icon={<Heart className="w-5 h-5" />}
          label="Favoris"
          value={totalFavorites.toLocaleString('fr-FR')}
          color="bg-rose-50 text-rose-600"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <KPICard
          icon={<Star className="w-5 h-5 fill-amber-400 text-amber-400" />}
          label="Note moyenne"
          value={avgRating.toFixed(1) + ' / 5'}
          subValue={`${totalComments} avis`}
          color="bg-amber-50 text-amber-600"
        />
        <KPICard
          icon={<Users className="w-5 h-5" />}
          label="Followers"
          value={followersCount.toLocaleString('fr-FR')}
          color="bg-purple-50 text-purple-600"
        />
        <KPICard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Vues (30j)"
          value={viewsRecent.length.toLocaleString('fr-FR')}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              Vues des 30 derniers jours
            </h2>
            <span className="text-sm text-slate-500">{viewsRecent.length} vues</span>
          </div>

          {/* Bar chart */}
          <div className="h-48 flex items-end gap-1 overflow-x-auto pb-6">
            {Object.entries(viewsByDay).map(([day, count]) => {
              const h = (count / maxDayViews) * 100;
              const date = new Date(day);
              return (
                <div key={day} className="flex-shrink-0 flex flex-col items-center" style={{ width: 16 }}>
                  <div className="text-[9px] text-slate-400 mb-0.5">{count || ''}</div>
                  <div
                    className="w-3 bg-gradient-to-t from-primary-400 to-primary-600 rounded-t hover:opacity-80 transition"
                    style={{ height: `${Math.max(h, 2)}%`, minHeight: 2 }}
                    title={`${day}: ${count} vues`}
                  />
                  <div className="text-[8px] text-slate-400 mt-0.5">
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top countries */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary-500" />
            Activité récente
          </h2>
          {topCountries.length === 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Total vues (30j)</span>
                <span className="font-bold text-primary-600">{viewsRecent.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Moyenne / jour</span>
                <span className="font-bold text-primary-600">{Math.round(viewsRecent.length / 30)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Pic (1 jour)</span>
                <span className="font-bold text-primary-600">{maxDayViews}</span>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                💡 Les stats par pays arrivent bientôt (nécessite tracking IP)
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {topCountries.map(([country, count]) => {
                const pct = Math.round((count / viewsRecent.length) * 100);
                return (
                  <div key={country}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-semibold">{country}</span>
                      <span className="text-xs text-slate-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top resources */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mt-6">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          Top ressources
        </h2>
        {topResources.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            Aucune ressource publiée pour le moment
          </p>
        ) : (
          <div className="space-y-2">
            {topResources.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  i === 0 ? 'bg-amber-100 text-amber-700' :
                  i === 1 ? 'bg-slate-200 text-slate-700' :
                  i === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{r.title}</div>
                  <div className="text-xs text-slate-500">Publié {timeAgo(new Date(r.createdAt))}</div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-slate-600">
                    <Eye className="w-4 h-4" /> {r.viewsCount}
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <Download className="w-4 h-4" /> {r.downloadsCount}
                  </span>
                  {r.avgRating > 0 && (
                    <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                      <Star className="w-4 h-4 fill-current" /> {r.avgRating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, subValue, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-slate-500">
        {label}
        {subValue && <span className="ml-1 text-slate-400">· {subValue}</span>}
      </div>
    </div>
  );
}