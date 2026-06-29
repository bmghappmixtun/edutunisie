import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  BarChart3, Eye, Download, Users, FileText, TrendingUp,
  ArrowUpRight, ExternalLink, Activity, Globe, Calendar, BookOpen,
  Star, MessageSquare, Award
} from 'lucide-react';
import { formatNumber, timeAgo } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Analytics — Admin',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Vercel Analytics URL — configurable via env var, with sensible fallback.
//
// To point to your actual project dashboard:
//   1. Open https://vercel.com/dashboard and find your examanet project
//   2. Click on the project → top tab "Analytics"
//   3. Copy the URL from your browser
//   4. Add NEXT_PUBLIC_VERCEL_ANALYTICS_URL=<that-url> in Vercel project settings
//
// Default fallback tries to derive the URL from Vercel runtime env vars:
//   - VERCEL_GIT_REPO_OWNER (e.g. "bmghappmixtun")
//   - VERCEL_GIT_REPO_SLUG (e.g. "edutunisie")
const VERCEL_ANALYTICS_URL =
  process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_URL ||
  (process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
    ? `https://vercel.com/${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}/analytics`
    : 'https://vercel.com/dashboard/analytics');

function pct(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function trendArrow(delta: number): { sign: 'up' | 'down' | 'flat'; label: string } {
  if (delta > 0) return { sign: 'up', label: `+${delta}%` };
  if (delta < 0) return { sign: 'down', label: `${delta}%` };
  return { sign: 'flat', label: '0%' };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');
  if (user.role !== 'ADMIN') redirect('/');

  const sp = await searchParams;
  const days = parseInt(sp.range || '30', 10);
  const since = new Date(Date.now() - days * 86400000);
  const prevSince = new Date(Date.now() - days * 2 * 86400000);

  // -------- Real DB stats (resource views, downloads, etc.) --------
  const [
    totalUsers,
    totalResources,
    totalPublished,
    totalDownloadsAgg,
    totalComments,
    totalRatings,
    totalFavorites,
    totalFollows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.resource.count(),
    prisma.resource.count({ where: { status: 'PUBLISHED' } }),
    prisma.resource.aggregate({ where: { status: 'PUBLISHED' }, _sum: { downloadsCount: true } }),
    prisma.comment.count(),
    prisma.rating.count(),
    prisma.favorite.count(),
    prisma.follow.count(),
  ]);

  // -------- Period stats (this range vs previous range) --------
  const [
    viewsThisPeriod,
    viewsPrevPeriod,
    downloadsThisPeriod,
    downloadsPrevPeriod,
    newUsersThisPeriod,
    newUsersPrevPeriod,
    newResourcesThisPeriod,
    newResourcesPrevPeriod,
  ] = await Promise.all([
    prisma.view.count({ where: { createdAt: { gte: since } } }),
    prisma.view.count({ where: { createdAt: { gte: prevSince, lt: since } } }),
    prisma.download.count({ where: { createdAt: { gte: since } } }),
    prisma.download.count({ where: { createdAt: { gte: prevSince, lt: since } } }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({ where: { createdAt: { gte: prevSince, lt: since } } }),
    prisma.resource.count({ where: { createdAt: { gte: since } } }),
    prisma.resource.count({ where: { createdAt: { gte: prevSince, lt: since } } }),
  ]);

  // -------- Daily timeseries (last N days) --------
  const dailyViews = await prisma.$queryRaw<Array<{ day: Date; n: bigint }>>`
    SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*) as n
    FROM "View"
    WHERE "createdAt" >= ${since}
    GROUP BY day
    ORDER BY day ASC
  `;
  const dailyDownloads = await prisma.$queryRaw<Array<{ day: Date; n: bigint }>>`
    SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*) as n
    FROM "Download"
    WHERE "createdAt" >= ${since}
    GROUP BY day
    ORDER BY day ASC
  `;
  const dailyUsers = await prisma.$queryRaw<Array<{ day: Date; n: bigint }>>`
    SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*) as n
    FROM "User"
    WHERE "createdAt" >= ${since}
    GROUP BY day
    ORDER BY day ASC
  `;

  // -------- Top resources --------
  const topResources = await prisma.resource.findMany({
    where: { status: 'PUBLISHED' },
    take: 10,
    orderBy: { viewsCount: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      viewsCount: true,
      downloadsCount: true,
      avgRating: true,
      subject: { select: { nameFr: true, color: true } },
      teacher: { select: { firstName: true, lastName: true } },
    },
  });

  // -------- Top teachers (by followers) --------
  const topTeachers = await prisma.user.findMany({
    where: { role: 'TEACHER', status: 'ACTIVE' },
    take: 5,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      schoolName: true,
      _count: {
        select: {
          uploadedFiles: { where: { status: 'PUBLISHED' } },
          followers: true,
        },
      },
    },
  });

  // Sort by followers
  topTeachers.sort((a, b) => b._count.followers - a._count.followers);

  // -------- Subject breakdown --------
  const subjectStats = await prisma.resource.groupBy({
    by: ['subjectId'],
    where: { status: 'PUBLISHED' },
    _count: { _all: true },
    _sum: { viewsCount: true, downloadsCount: true },
  });
  const subjects = await prisma.subject.findMany({
    select: { id: true, nameFr: true, color: true, slug: true },
  });
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const subjectBreakdown = subjectStats
    .map((s) => ({
      ...s,
      subject: subjectMap.get(s.subjectId),
    }))
    .filter((s) => s.subject)
    .sort((a, b) => Number(b._count._all) - Number(a._count._all))
    .slice(0, 8);

  // -------- Build sparkline data --------
  const viewSeries = buildSparkline(dailyViews, days);
  const downloadSeries = buildSparkline(dailyDownloads, days);
  const userSeries = buildSparkline(dailyUsers, days);

  // -------- Trends --------
  const viewsTrend = trendArrow(pct(viewsThisPeriod, viewsPrevPeriod) || 0);
  const downloadsTrend = trendArrow(pct(downloadsThisPeriod, downloadsPrevPeriod) || 0);
  const usersTrend = trendArrow(pct(newUsersThisPeriod, newUsersPrevPeriod) || 0);
  const resourcesTrend = trendArrow(pct(newResourcesThisPeriod, newResourcesPrevPeriod) || 0);

  // -------- Range options --------
  const ranges = [
    { value: '7', label: '7 jours' },
    { value: '30', label: '30 jours' },
    { value: '90', label: '90 jours' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold mb-2 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary-600" />
            Analytics
          </h1>
          <p className="text-slate-500 text-sm">
            Vue d'ensemble de l'activité de la plateforme sur les <strong>{days}</strong> derniers jours.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Range selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden">
            {ranges.map((r) => (
              <Link
                key={r.value}
                href={`/admin/analytics?range=${r.value}`}
                className={`px-3 py-2 text-sm font-semibold transition ${
                  days === parseInt(r.value, 10)
                    ? 'bg-primary-500 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {r.label}
              </Link>
            ))}
          </div>
          {/* Vercel link */}
          <a
            href={VERCEL_ANALYTICS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
          >
            <Activity className="w-4 h-4" />
            Vercel Analytics
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Eye}
          label="Vues (période)"
          value={formatNumber(viewsThisPeriod)}
          delta={viewsTrend}
          sparkline={viewSeries}
          color="from-blue-500 to-blue-600"
          bg="bg-blue-100"
          text="text-blue-600"
        />
        <KpiCard
          icon={Download}
          label="Téléchargements"
          value={formatNumber(downloadsThisPeriod)}
          delta={downloadsTrend}
          sparkline={downloadSeries}
          color="from-emerald-500 to-emerald-600"
          bg="bg-emerald-100"
          text="text-emerald-600"
        />
        <KpiCard
          icon={Users}
          label="Nouveaux utilisateurs"
          value={formatNumber(newUsersThisPeriod)}
          delta={usersTrend}
          sparkline={userSeries}
          color="from-amber-500 to-amber-600"
          bg="bg-amber-100"
          text="text-amber-600"
        />
        <KpiCard
          icon={FileText}
          label="Nouvelles ressources"
          value={formatNumber(newResourcesThisPeriod)}
          delta={resourcesTrend}
          sparkline={null}
          color="from-purple-500 to-purple-600"
          bg="bg-purple-100"
          text="text-purple-600"
        />
      </div>

      {/* Global totals */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Globe className="w-4 h-4" />
          Totaux depuis le lancement
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          <TotalItem icon={Users} value={totalUsers} label="Utilisateurs" />
          <TotalItem icon={FileText} value={totalPublished} label="Ressources" sub={`/ ${totalResources} totales`} />
          <TotalItem icon={Eye} value={totalDownloadsAgg._sum.downloadsCount || 0} label="Téléch. cumulés" />
          <TotalItem icon={Star} value={totalRatings} label="Notes" />
          <TotalItem icon={MessageSquare} value={totalComments} label="Commentaires" />
          <TotalItem icon={BookOpen} value={totalFavorites} label="Favoris" />
          <TotalItem icon={Award} value={totalFollows} label="Abonnements" />
        </div>
      </div>

      {/* Two columns: top resources + top teachers */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top resources */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            Top 10 ressources les plus vues
          </h2>
          <ol className="space-y-2">
            {topResources.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3 group">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-extrabold flex-shrink-0 ${
                    i === 0 ? 'bg-amber-100 text-amber-700' :
                    i === 1 ? 'bg-slate-200 text-slate-700' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-50 text-slate-500'
                  }`}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/ressources/${r.slug}`}
                    target="_blank"
                    className="font-semibold text-sm text-slate-800 hover:text-primary-600 line-clamp-1 group flex items-center gap-1"
                  >
                    {r.title}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    {r.subject && (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.subject.color || '#0EA5E9' }} />
                        {r.subject.nameFr}
                      </span>
                    )}
                    {r.teacher && (
                      <span>· {r.teacher.firstName} {r.teacher.lastName}</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-extrabold text-slate-700">{formatNumber(r.viewsCount)} <span className="text-xs text-slate-400 font-normal">vues</span></div>
                  <div className="text-xs text-slate-400">{formatNumber(r.downloadsCount)} DL · ★ {r.avgRating.toFixed(1)}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Top teachers */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            Professeurs les plus suivis
          </h2>
          <ol className="space-y-3">
            {topTeachers.map((t, i) => (
              <li key={t.id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/professeurs/${t.id}`}
                    target="_blank"
                    className="font-semibold text-sm text-slate-800 hover:text-primary-600 truncate block"
                  >
                    {t.firstName} {t.lastName}
                  </Link>
                  {t.schoolName && (
                    <div className="text-xs text-slate-400 truncate">{t.schoolName}</div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-extrabold text-amber-600">{t._count.followers}</div>
                  <div className="text-[10px] text-slate-400 uppercase">abonnés</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Subject breakdown */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" />
          Répartition par matière
        </h2>
        <div className="space-y-2">
          {subjectBreakdown.map((s) => {
            const total = subjectBreakdown.reduce((sum, x) => sum + Number(x._count._all), 0);
            const pct = total > 0 ? Math.round((Number(s._count._all) / total) * 100) : 0;
            return (
              <div key={s.subjectId} className="flex items-center gap-3">
                <Link
                  href={`/matieres/${s.subject?.slug}`}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-primary-600 w-48 flex-shrink-0"
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.subject?.color || '#0EA5E9' }} />
                  <span className="truncate">{s.subject?.nameFr}</span>
                </Link>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: s.subject?.color || '#0EA5E9',
                    }}
                  />
                </div>
                <div className="text-sm font-bold text-slate-600 w-16 text-right">
                  {pct}%
                </div>
                <div className="text-xs text-slate-400 w-20 text-right">
                  {formatNumber(Number(s._count._all))} ressources
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vercel Analytics info banner */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
              Vercel Web Analytics
              <span className="text-xs font-normal bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">Actif</span>
            </h3>
            <p className="text-slate-300 text-sm mb-3">
              Pour les métriques de navigation détaillées (visiteurs uniques, pages vues par URL,
              temps passé, taux de rebond, provenance géographique), utilise le dashboard Vercel.
              Les données sont collectées automatiquement par le composant Analytics dans le layout.
            </p>
            <a
              href={VERCEL_ANALYTICS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-slate-900 rounded-lg font-semibold text-sm hover:bg-slate-100 transition"
            >
              Ouvrir le dashboard Vercel
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  sparkline,
  color,
  bg,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta: { sign: 'up' | 'down' | 'flat'; label: string };
  sparkline: number[] | null;
  color: string;
  bg: string;
  text: string;
}) {
  const deltaColor =
    delta.sign === 'up' ? 'text-emerald-600 bg-emerald-50' :
    delta.sign === 'down' ? 'text-rose-600 bg-rose-50' :
    'text-slate-500 bg-slate-50';
  const arrow = delta.sign === 'up' ? '↑' : delta.sign === 'down' ? '↓' : '→';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${text}`} />
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${deltaColor}`}>
          {arrow} {delta.label}
        </span>
      </div>
      <div className="text-2xl lg:text-3xl font-extrabold text-slate-900">{value}</div>
      <div className="text-xs font-medium text-slate-500 mt-0.5">{label}</div>
      {sparkline && sparkline.length > 0 && (
        <div className="mt-3 h-8">
          <Sparkline data={sparkline} color={color} />
        </div>
      )}
    </div>
  );
}

function TotalItem({
  icon: Icon,
  value,
  label,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  sub?: string;
}) {
  return (
    <div className="text-center">
      <Icon className="w-4 h-4 mx-auto mb-1 text-slate-400" />
      <div className="text-xl font-extrabold text-slate-900">{formatNumber(value)}</div>
      <div className="text-xs text-slate-500">{label}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 200;
  const h = 32;
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  const gradId = `sg-${color.replace(/\s/g, '')}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`0,${h} ${points} ${w},${h}`}
        fill={`url(#${gradId})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function buildSparkline(rows: Array<{ day: Date; n: bigint }>, days: number): number[] {
  // Build a continuous array of length `days`, filling 0 for missing days
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = new Date(r.day).toISOString().slice(0, 10);
    map.set(key, Number(r.n));
  }
  const out: number[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push(map.get(key) || 0);
  }
  return out;
}