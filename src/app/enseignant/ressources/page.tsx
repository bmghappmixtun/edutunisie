import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  FileText, Eye, Download, Edit, Trash2, CheckCircle, Clock, XCircle, Plus,
  AlertCircle, RefreshCw, Filter
} from 'lucide-react';
import { formatNumber, timeAgo } from '@/lib/utils';
import { isArabic } from '@/lib/text-utils';
import DeleteResourceButton from '@/components/teacher/DeleteResourceButton';

export const dynamic = 'force-dynamic';

export default async function TeacherResourcesPage(props: { params: Promise<any>; searchParams: Promise<any> }) {
  const sp = await props.searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');

  const status = sp?.status || 'ALL';
  const editStatus = sp?.editStatus || 'ALL';
  const page = parseInt(sp?.page || '1');
  const limit = 20;

  // Check if teacher can upload (status === ACTIVE)
  const teacher = await prisma.user.findUnique({
    where: { id: user.id },
    select: { status: true }
  });
  const canUpload = teacher?.status === 'ACTIVE';

  const where: any = { teacherId: user.id };
  if (status !== 'ALL') where.status = status;
  if (editStatus !== 'ALL') where.editStatus = editStatus;

  const [resources, total, subjects] = await Promise.all([
    prisma.resource.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { updatedAt: 'desc' },
      include: { subject: true, class: true, section: true }
    }),
    prisma.resource.count({ where }),
    prisma.subject.findMany({ orderBy: { order: 'asc' }, select: { id: true, nameFr: true, icon: true } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Stats
  const [published, pendingApproval, rejected, pendingEdit, editRejected] = await Promise.all([
    prisma.resource.count({ where: { teacherId: user.id, status: 'PUBLISHED' } }),
    prisma.resource.count({ where: { teacherId: user.id, status: 'PENDING_APPROVAL' } }),
    prisma.resource.count({ where: { teacherId: user.id, status: 'REJECTED' } }),
    prisma.resource.count({ where: { teacherId: user.id, editStatus: 'PENDING_EDIT_APPROVAL' } }),
    prisma.resource.count({ where: { teacherId: user.id, editStatus: 'EDIT_REJECTED' } }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Mes ressources 📚</h1>
          <p className="text-slate-500 text-sm mt-1">{total} ressource{total > 1 ? 's' : ''} au total</p>
        </div>
        {canUpload ? (
          <Link href="/enseignant/ajouter" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nouvelle ressource
          </Link>
        ) : (
          <span
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 font-semibold rounded-xl cursor-not-allowed"
            title="Soumettez vos fichiers de vérification pour publier"
          >
            <Plus className="w-4 h-4" /> Nouvelle ressource
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">🔒</span>
          </span>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Publiées" value={published} dot="bg-emerald-500" href="/enseignant/ressources?status=PUBLISHED" active={status === 'PUBLISHED'} />
        <StatCard label="En attente" value={pendingApproval} dot="bg-amber-500" href="/enseignant/ressources?status=PENDING_APPROVAL" active={status === 'PENDING_APPROVAL'} />
        <StatCard label="Refusées" value={rejected} dot="bg-red-500" href="/enseignant/ressources?status=REJECTED" active={status === 'REJECTED'} />
        <StatCard label="Modifs en attente" value={pendingEdit} dot="bg-blue-500" href="/enseignant/ressources?editStatus=PENDING_EDIT_APPROVAL" active={editStatus === 'PENDING_EDIT_APPROVAL'} />
        <StatCard label="Modifs refusées" value={editRejected} dot="bg-orange-500" href="/enseignant/ressources?editStatus=EDIT_REJECTED" active={editStatus === 'EDIT_REJECTED'} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-2 overflow-x-auto">
        <Filter className="w-4 h-4 text-slate-400 ml-2 flex-shrink-0" />
        <Link href="/enseignant/ressources" className={`px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap ${status === 'ALL' && editStatus === 'ALL' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
          Toutes
        </Link>
        <span className="text-slate-300">|</span>
        <span className="text-xs text-slate-400 font-semibold">Statut:</span>
        {[
          { v: 'PUBLISHED', label: 'Publiées', cls: 'text-emerald-700' },
          { v: 'PENDING_APPROVAL', label: 'En attente', cls: 'text-amber-700' },
          { v: 'REJECTED', label: 'Refusées', cls: 'text-red-700' },
        ].map(s => (
          <Link key={s.v} href={`/enseignant/ressources?status=${s.v}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap ${status === s.v ? 'bg-slate-900 text-white' : `hover:bg-slate-100 ${s.cls}`}`}>
            {s.label}
          </Link>
        ))}
      </div>

      {/* Resources list */}
      {resources.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="font-bold text-xl mb-2">Aucune ressource</h3>
          <p className="text-slate-500 mb-4">Commencez par ajouter votre première ressource</p>
          {canUpload ? (
            <Link href="/enseignant/ajouter" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Ajouter une ressource
            </Link>
          ) : (
            <Link href="/enseignant" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Soumettre mes fichiers
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map(r => (
            <ResourceRow key={r.id} r={r} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 10).map(p => (
            <Link key={p} href={`/enseignant/ressources?${new URLSearchParams({ ...sp, page: String(p) })}`}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold ${
                p === page ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 hover:bg-slate-50'
              }`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, dot, href, active }: { label: string; value: number; dot: string; href: string; active?: boolean }) {
  return (
    <Link href={href} className={`bg-white rounded-xl border p-3 transition ${active ? 'border-primary-500 ring-2 ring-primary-100' : 'border-slate-200 hover:border-slate-300'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${dot}`}></span>
        <span className="text-xs text-slate-500 font-semibold">{label}</span>
      </div>
      <div className="text-2xl font-extrabold">{value}</div>
    </Link>
  );
}

function ResourceRow({ r }: { r: any }) {
  const hasPending = r.editStatus === 'PENDING_EDIT_APPROVAL';
  const wasRejected = r.editStatus === 'EDIT_REJECTED';
  const pending = r.pendingEdit as any;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-12 h-14 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl">
          {r.subject?.icon || '📄'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link
              href={`/ressources/${r.slug}`}
              className={`font-bold text-slate-900 hover:text-primary-600 transition truncate ${isArabic(r.title) ? 'text-right' : 'text-left'}`}
              dir={isArabic(r.title) ? 'rtl' : 'ltr'}
              lang={isArabic(r.title) ? 'ar' : 'fr'}
            >
              {r.title}
            </Link>
            <StatusBadge status={r.status} />
            {hasPending && <PendingEditBadge summary={r.editSummary} />}
            {wasRejected && <RejectedEditBadge reason={r.editRejectionReason} />}
          </div>

          <div className="text-xs text-slate-500 mb-2 flex items-center gap-2 flex-wrap">
            <span>{r.subject?.nameFr}</span>
            {r.class && <span>· {r.class.nameFr}</span>}
            {r.section && <span>· {r.section.nameFr}</span>}
            <span>· {timeAgo(r.createdAt)}</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {formatNumber(r.viewsCount)}</span>
            <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {formatNumber(r.downloadsCount)}</span>
            <span className="flex items-center gap-1">⭐ {r.avgRating.toFixed(1)}</span>
            <span>{(r.fileSize / 1024 / 1024).toFixed(1)} MB</span>
          </div>

          {/* Show pending changes preview */}
          {hasPending && pending && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs">
              <div className="font-bold text-amber-800 flex items-center gap-1 mb-1">
                <AlertCircle className="w-3 h-3" /> Modifications proposées (en attente d'approbation)
              </div>
              <div className="text-amber-700">
                {Object.keys(pending).filter(k => k !== 'fileKey' && k !== 'fileUrl').map(k => (
                  <span key={k} className="inline-block px-1.5 py-0.5 bg-amber-100 rounded mr-1 mb-1">
                    {k}
                  </span>
                ))}
                {pending.fileKey && <span className="inline-block px-1.5 py-0.5 bg-amber-100 rounded mr-1 mb-1">📎 nouveau fichier</span>}
              </div>
            </div>
          )}

          {/* Show rejection reason */}
          {wasRejected && r.editRejectionReason && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <span className="font-bold">Raison du refus :</span> {r.editRejectionReason}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link href={`/ressources/${r.slug}`} title="Voir" className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            href={`/enseignant/ressources/${r.id}/modifier`}
            title={hasPending ? 'Modification en attente' : 'Modifier'}
            className={`p-2 rounded-lg ${hasPending ? 'text-amber-400 cursor-not-allowed pointer-events-none' : 'hover:bg-slate-100 text-slate-600'}`}
          >
            <Edit className="w-4 h-4" />
          </Link>
          <DeleteResourceButton resourceId={r.id} resourceTitle={r.title} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: any = {
    PUBLISHED: { icon: CheckCircle, label: 'Publié', cls: 'bg-emerald-100 text-emerald-700' },
    PENDING_APPROVAL: { icon: Clock, label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
    REJECTED: { icon: XCircle, label: 'Refusé', cls: 'bg-red-100 text-red-700' },
    DRAFT: { icon: FileText, label: 'Brouillon', cls: 'bg-slate-100 text-slate-700' },
  };
  const s = map[status] || map.DRAFT;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${s.cls}`}>
      <Icon className="w-3 h-3" /> {s.label}
    </span>
  );
}

function PendingEditBadge({ summary }: { summary?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
      <RefreshCw className="w-3 h-3" /> {summary ? `Modif: ${summary}` : 'Modif en attente'}
    </span>
  );
}

function RejectedEditBadge({ reason }: { reason?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700">
      <XCircle className="w-3 h-3" /> Modif refusée
    </span>
  );
}
