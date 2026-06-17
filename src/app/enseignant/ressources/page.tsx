import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { FileText, Eye, Download, Edit, Trash2, CheckCircle, Clock, XCircle, Plus } from 'lucide-react';
import { formatNumber, timeAgo } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TeacherResourcesPage(props: { params: Promise<any>; searchParams: Promise<any> }) {
  const sp = await props.searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');
  const status = sp?.status || 'ALL';
  const page = parseInt(sp?.page || '1');

  const where: any = { teacherId: user.id };
  if (status !== 'ALL') where.status = status;

  const [resources, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      take: 20,
      skip: (page - 1) * 20,
      orderBy: { createdAt: 'desc' },
      include: { subject: true }
    }),
    prisma.resource.count({ where })
  ]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold">Mes ressources 📚</h1>
        <Link href="/enseignant/ajouter" className="btn-accent"><Plus className="w-4 h-4" /> Ajouter</Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl p-2 border border-slate-100 overflow-x-auto">
        {['ALL', 'PUBLISHED', 'PENDING_APPROVAL', 'REJECTED'].map(s => (
          <Link key={s} href={`/enseignant/ressources?status=${s}`}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${status === s ? 'bg-primary-500 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
            {s === 'ALL' ? 'Tous' : s === 'PUBLISHED' ? 'Publiés' : s === 'PENDING_APPROVAL' ? 'En attente' : 'Rejetés'}
          </Link>
        ))}
      </div>

      {resources.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="font-bold text-xl mb-2">Aucune ressource</h3>
          <Link href="/enseignant/ajouter" className="btn-accent mt-3">Ajouter ma première ressource</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map(r => (
            <div key={r.id} className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-14 bg-slate-100 rounded flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/ressources/${r.slug}`} className="font-bold text-sm hover:text-primary-600 transition truncate block">{r.title}</Link>
                <div className="text-xs text-slate-500">{r.subject.nameFr} · {timeAgo(r.createdAt)}</div>
                <div className="flex gap-4 mt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {formatNumber(r.viewsCount)}</span>
                  <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {formatNumber(r.downloadsCount)}</span>
                  <span className="flex items-center gap-1">⭐ {r.avgRating.toFixed(1)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                  r.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' :
                  r.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {r.status === 'PUBLISHED' ? '✓ Publié' : r.status === 'PENDING_APPROVAL' ? '⏳ En attente' : '✕ Rejeté'}
                </span>
                <Link href={`/ressources/${r.slug}`} className="p-2 hover:bg-slate-100 rounded-lg"><Eye className="w-4 h-4" /></Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
