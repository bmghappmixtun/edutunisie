import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { Users, FileText, Star, Download, AlertCircle } from 'lucide-react';
import { formatNumber, timeAgo } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');

  const [totalUsers, totalStudents, totalTeachers, pendingTeachers, totalResources, publishedResources, pendingResources] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'TEACHER' } }),
    prisma.user.count({ where: { role: 'TEACHER', status: 'PENDING_APPROVAL' } }),
    prisma.resource.count(),
    prisma.resource.count({ where: { status: 'PUBLISHED' } }),
    prisma.resource.count({ where: { status: 'PENDING_APPROVAL' } }),
  ]);

  const [totalDownloads, totalComments, totalRatings] = await Promise.all([
    prisma.resource.aggregate({ where: { status: 'PUBLISHED' }, _sum: { downloadsCount: true } }),
    prisma.comment.count(),
    prisma.rating.count(),
  ]);

  const recentResources = await prisma.resource.findMany({
    where: { status: { in: ['PENDING_APPROVAL', 'PUBLISHED'] } },
    take: 8,
    orderBy: { createdAt: 'desc' },
    include: { subject: true, teacher: { select: { firstName: true, lastName: true } } }
  });

  const recentUsers = await prisma.user.findMany({
    take: 6,
    orderBy: { createdAt: 'desc' },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true, createdAt: true }
  });

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">🛡️ Dashboard Administrateur</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Users, value: totalUsers, label: 'Utilisateurs', sub: `${totalStudents} élèves · ${totalTeachers} enseignants`, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-100', text: 'text-blue-600' },
          { icon: FileText, value: totalResources, label: 'Ressources', sub: `${publishedResources} publiées`, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-100', text: 'text-emerald-600' },
          { icon: Download, value: totalDownloads._sum.downloadsCount || 0, label: 'Téléchargements', color: 'from-amber-500 to-amber-600', bg: 'bg-amber-100', text: 'text-amber-600' },
          { icon: Star, value: totalRatings, label: 'Avis déposés', color: 'from-purple-500 to-purple-600', bg: 'bg-purple-100', text: 'text-purple-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-5 border border-slate-100">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.text}`} />
            </div>
            <div className="text-2xl font-extrabold">{formatNumber(s.value as number)}</div>
            <div className="text-sm font-semibold text-slate-700">{s.label}</div>
            {s.sub && <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(pendingTeachers > 0 || pendingResources > 0) && (
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {pendingTeachers > 0 && (
            <Link href="/admin/approbations" className="flex items-center justify-between p-5 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition">
              <div>
                <div className="font-bold text-amber-800">⏳ {pendingTeachers} enseignant{pendingTeachers > 1 ? 's' : ''} en attente</div>
                <div className="text-sm text-amber-600">Cliquez pour approuver ou rejeter</div>
              </div>
              <AlertCircle className="w-6 h-6 text-amber-500" />
            </Link>
          )}
          {pendingResources > 0 && (
            <Link href="/admin/approbations" className="flex items-center justify-between p-5 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition">
              <div>
                <div className="font-bold text-orange-800">📄 {pendingResources} ressource{pendingResources > 1 ? 's' : ''} à valider</div>
                <div className="text-sm text-orange-600">Cliquez pour examiner</div>
              </div>
              <FileText className="w-6 h-6 text-orange-500" />
            </Link>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent resources */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">📄 Dernières ressources</h2>
            <Link href="/admin/ressources" className="text-sm text-primary-600 font-semibold hover:underline">Tout voir →</Link>
          </div>
          <div className="space-y-3">
            {recentResources.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-10 bg-slate-100 rounded flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{r.title}</div>
                    <div className="text-xs text-slate-500">{r.teacher?.firstName} {r.teacher?.lastName} · {r.subject.nameFr}</div>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-bold rounded flex-shrink-0 ${
                  r.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {r.status === 'PUBLISHED' ? '✓' : '⏳'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent users */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">👥 Derniers inscrits</h2>
            <Link href="/admin/utilisateurs" className="text-sm text-primary-600 font-semibold hover:underline">Tout voir →</Link>
          </div>
          <div className="space-y-3">
            {recentUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white font-bold text-xs flex items-center justify-center">
                    {(u.firstName?.[0] || u.email[0]).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-2 py-1 text-xs font-bold rounded ${
                    u.role === 'ADMIN' ? 'bg-red-100 text-red-700' : u.role === 'TEACHER' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {u.role === 'ADMIN' ? 'Admin' : u.role === 'TEACHER' ? 'Prof' : 'Élève'}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{timeAgo(u.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
