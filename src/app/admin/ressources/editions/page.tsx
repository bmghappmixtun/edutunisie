import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { CheckCircle2, XCircle, FileText, Clock, AlertCircle, User } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import EditReviewActions from '@/components/admin/EditReviewActions';

export const dynamic = 'force-dynamic';

export default async function PendingEditsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');
  if (user.role !== 'ADMIN') redirect('/');

  const pendingEdits = await prisma.resource.findMany({
    where: { editStatus: 'PENDING_EDIT_APPROVAL' },
    orderBy: { editRequestedAt: 'desc' },
    include: {
      subject: true,
      class: true,
      section: true,
      editRequestedBy: { select: { id: true, firstName: true, lastName: true, email: true, schoolName: true } },
    },
  });

  const recentlyRejected = await prisma.resource.findMany({
    where: { editStatus: 'EDIT_REJECTED' },
    orderBy: { editReviewedAt: 'desc' },
    take: 5,
    include: { subject: true, editRequestedBy: { select: { firstName: true, lastName: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">✏️ Modifications en attente</h1>
        <p className="text-slate-500 mt-1">
          Approuvez ou refusez les modifications proposées par les enseignants.
        </p>
      </div>

      {/* Stats banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <div className="text-3xl font-extrabold text-blue-700">{pendingEdits.length}</div>
          <div className="text-sm text-blue-600 font-semibold">En attente</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-3xl font-extrabold text-amber-700">
            {pendingEdits.filter(p => {
              const d = p.editRequestedAt ? (Date.now() - new Date(p.editRequestedAt).getTime()) / 86400000 : 0;
              return d > 3;
            }).length}
          </div>
          <div className="text-sm text-amber-600 font-semibold">&gt; 3 jours</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="text-3xl font-extrabold text-emerald-700">
            {pendingEdits.filter(p => {
              const d = p.editRequestedAt ? (Date.now() - new Date(p.editRequestedAt).getTime()) / 86400000 : 0;
              return d < 1;
            }).length}
          </div>
          <div className="text-sm text-emerald-600 font-semibold">Aujourd'hui</div>
        </div>
      </div>

      {/* Pending list */}
      {pendingEdits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-emerald-300" />
          <h3 className="font-bold text-xl mb-2">Tout est à jour !</h3>
          <p className="text-slate-500">Aucune modification en attente d'approbation.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingEdits.map(r => {
            const pending = (r.pendingEdit as any) || {};
            const changes = Object.keys(pending).filter(k => !['fileKey', 'fileUrl'].includes(k));
            const hasNewFile = !!pending.fileKey;
            const teacherName = r.editRequestedBy ? `${r.editRequestedBy.firstName} ${r.editRequestedBy.lastName}` : 'Inconnu';
            const waited = r.editRequestedAt ? Math.floor((Date.now() - new Date(r.editRequestedAt).getTime()) / 3600000) : 0;
            const isUrgent = waited > 72; // > 3 days

            return (
              <div key={r.id} className={`bg-white rounded-2xl border-2 ${isUrgent ? 'border-amber-300' : 'border-slate-200'} p-5`}>
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {teacherName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{teacherName}</span>
                      {r.editRequestedBy?.schoolName && (
                        <span className="text-xs text-slate-500">· {r.editRequestedBy.schoolName}</span>
                      )}
                      {isUrgent && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                          ⚠️ En attente depuis {waited}h
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {r.editRequestedAt && timeAgo(r.editRequestedAt)}
                    </div>
                  </div>
                </div>

                {/* Resource info */}
                <div className="bg-slate-50 rounded-lg p-3 mb-4">
                  <div className="text-xs text-slate-500 mb-1">Ressource actuelle :</div>
                  <Link href={`/ressources/${r.slug}`} target="_blank" className="font-bold text-slate-900 hover:text-primary-600">
                    {r.title}
                  </Link>
                  <div className="text-xs text-slate-500 mt-1">
                    {r.subject?.nameFr} {r.class && `· ${r.class.nameFr}`} {r.section && `· ${r.section.nameFr}`}
                  </div>
                </div>

                {/* Changes */}
                <div className="mb-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Modifications proposées :
                  </div>
                  <div className="space-y-2">
                    {changes.map(field => {
                      const oldVal = (r as any)[field];
                      const newVal = pending[field];
                      return (
                        <div key={field} className="flex items-start gap-3 text-sm">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono font-bold flex-shrink-0">
                            {field}
                          </span>
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div className="bg-red-50 border border-red-200 rounded p-2">
                              <div className="text-[10px] text-red-600 font-bold uppercase">Avant</div>
                              <div className="text-slate-700 line-through">{oldVal || <em className="text-slate-400">(vide)</em>}</div>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
                              <div className="text-[10px] text-emerald-600 font-bold uppercase">Après</div>
                              <div className="text-slate-900 font-semibold">{newVal || <em className="text-slate-400">(vide)</em>}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {hasNewFile && (
                      <div className="flex items-center gap-2 text-sm bg-purple-50 border border-purple-200 rounded p-2">
                        <FileText className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold text-purple-900">📎 Nouveau fichier PDF</span>
                        <a href={pending.fileUrl} target="_blank" rel="noreferrer" className="ml-auto text-xs text-purple-600 hover:underline">
                          Aperçu →
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <EditReviewActions
                  resourceId={r.id}
                  resourceTitle={r.title}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Recently rejected */}
      {recentlyRejected.length > 0 && (
        <details className="bg-white rounded-2xl border border-slate-200 p-4">
          <summary className="font-bold text-sm text-slate-700 cursor-pointer">
            🕐 Modifications refusées récemment ({recentlyRejected.length})
          </summary>
          <div className="mt-3 space-y-2">
            {recentlyRejected.map(r => (
              <div key={r.id} className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                <div className="font-bold">{r.title}</div>
                <div className="text-xs text-red-700 mt-1">
                  Refusé {r.editReviewedAt && timeAgo(r.editReviewedAt)} · {r.editRejectionReason}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
