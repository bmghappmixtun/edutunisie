import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { FileText, Eye, Download, Star, Clock, TrendingUp, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { formatNumber, timeAgo } from '@/lib/utils';
import { isArabic } from '@/lib/text-utils';

export const dynamic = 'force-dynamic';

export default async function TeacherDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');

  const [totalResources, published, pending, rejected, recentResources] = await Promise.all([
    prisma.resource.count({ where: { teacherId: user.id } }),
    prisma.resource.count({ where: { teacherId: user.id, status: 'PUBLISHED' } }),
    prisma.resource.count({ where: { teacherId: user.id, status: 'PENDING_APPROVAL' } }),
    prisma.resource.count({ where: { teacherId: user.id, status: 'REJECTED' } }),
    prisma.resource.findMany({
      where: { teacherId: user.id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { subject: true }
    })
  ]);

  const allPublished = await prisma.resource.findMany({
    where: { teacherId: user.id, status: 'PUBLISHED' },
    select: { viewsCount: true, downloadsCount: true, avgRating: true }
  });

  const totalViews = allPublished.reduce((s, r) => s + r.viewsCount, 0);
  const totalDownloads = allPublished.reduce((s, r) => s + r.downloadsCount, 0);
  const avgRating = allPublished.length ? allPublished.reduce((s, r) => s + r.avgRating, 0) / allPublished.length : 0;

  const pendingResources = await prisma.resource.findMany({
    where: { teacherId: user.id, status: 'PENDING_APPROVAL' },
    include: { subject: true }
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold">Tableau de bord 👨‍🏫</h1>
        <Link href="/enseignant/ajouter" className="btn-accent">
          <Upload className="w-4 h-4" /> Ajouter une ressource
        </Link>
      </div>

      {/* Quick links to new features */}
      <div className="grid sm:grid-cols-1 gap-3 mb-6">
        <Link href="/enseignant/bibliotheque" className="group flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 hover:border-blue-400 transition">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition">📚</div>
          <div className="flex-1">
            <div className="font-bold text-slate-900">Ma bibliothèque personnelle</div>
            <div className="text-xs text-slate-600">Vos fichiers Word (.docx) originaux, jamais perdus. Téléchargeables par tous les enseignants.</div>
          </div>
          <span className="text-blue-500 group-hover:translate-x-1 transition">→</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        {[
          { icon: FileText, value: totalResources, label: 'Total', color: 'from-slate-500 to-slate-600', bg: 'bg-slate-100', text: 'text-slate-600' },
          { icon: CheckCircle, value: published, label: 'Publiés', color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-100', text: 'text-emerald-600' },
          { icon: Clock, value: pending, label: 'En attente', color: 'from-amber-500 to-amber-600', bg: 'bg-amber-100', text: 'text-amber-600' },
          { icon: AlertCircle, value: rejected, label: 'Rejetés', color: 'from-red-500 to-red-600', bg: 'bg-red-100', text: 'text-red-600' },
          { icon: Eye, value: totalViews, label: 'Vues totales', color: 'from-primary-500 to-primary-600', bg: 'bg-primary-100', text: 'text-primary-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-slate-100">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}><s.icon className={`w-4 h-4 ${s.text}`} /></div>
            <div className="text-xl font-extrabold">{formatNumber(s.value)}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Global stats */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary-600" /> Performance globale</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <Download className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
              <div className="text-2xl font-extrabold">{formatNumber(totalDownloads)}</div>
              <div className="text-xs text-slate-500">Téléchargements</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-xl">
              <Star className="w-6 h-6 mx-auto mb-1 text-amber-500" />
              <div className="text-2xl font-extrabold">{avgRating.toFixed(1)} / 5</div>
              <div className="text-xs text-slate-500">Note moyenne</div>
            </div>
          </div>
        </div>

        {/* Pending approval alert */}
        {pending > 0 && (
          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-amber-600" /> Ressources en attente</h2>
            <p className="text-sm text-amber-700 mb-3">Vos {pending} ressource{pending > 1 ? 's' : ''} sont en attente d'approbation par l'administrateur.</p>
            <div className="space-y-2">
              {pendingResources.map(r => (
                <div key={r.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                  <span
                    className={`text-sm font-medium truncate ${isArabic(r.title) ? 'text-right' : 'text-left'}`}
                    dir={isArabic(r.title) ? 'rtl' : 'ltr'}
                    lang={isArabic(r.title) ? 'ar' : 'fr'}
                  >
                    {r.title}
                  </span>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold flex-shrink-0">En attente</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent resources */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="font-bold text-lg mb-4">Dernières ressources</h2>
        {recentResources.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucune ressource. Ajoutez votre première !</p>
        ) : (
          <div className="space-y-3">
            {recentResources.map(r => (
              <Link key={r.id} href={`/ressources/${r.slug}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-12 bg-slate-100 rounded flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <div
                      className={`font-semibold text-sm ${isArabic(r.title) ? 'text-right' : 'text-left'}`}
                      dir={isArabic(r.title) ? 'rtl' : 'ltr'}
                      lang={isArabic(r.title) ? 'ar' : 'fr'}
                    >
                      {r.title}
                    </div>
                    <div className="text-xs text-slate-500">{r.subject.nameFr} · {timeAgo(r.createdAt)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs font-bold rounded ${
                    r.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' :
                    r.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {r.status === 'PUBLISHED' ? '✓ Publié' : r.status === 'PENDING_APPROVAL' ? '⏳ En attente' : '✕ Rejeté'}
                  </span>
                  <div className="text-xs text-slate-400 hidden sm:block">{formatNumber(r.viewsCount)} vues</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
