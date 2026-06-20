import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { CheckCircle2, FileText, Clock, AlertCircle } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import EditReviewActions from '@/components/admin/EditReviewActions';

export const dynamic = 'force-dynamic';

const TYPE_LABELS: Record<string, string> = {
  COURSE: '📖 Cours', HOMEWORK: '📝 Devoir', EXERCISE: '✏️ Exercice',
  SERIES: '📚 Série', BAC_SUBJECT: '🎓 Sujet Bac', CORRECTION: '✅ Corrigé',
  SUMMARY: '📄 Résumé', CARD: '🗂️ Fiche',
};

const FIELD_LABELS: Record<string, string> = {
  title: 'Titre',
  description: 'Description',
  type: 'Type',
  subjectId: 'Matière',
  classId: 'Classe',
  sectionId: 'Section',
  trimester: 'Trimestre',
  year: 'Année',
  tags: 'Tags',
  language: 'Langue',
};

function getFieldLabel(field: string, value: any, currentData: any): string {
  // For ID fields, look up the name from the relationship data
  if (field === 'subjectId' && value && currentData.subjects) {
    const subj = currentData.subjects.find((s: any) => s.id === value);
    if (subj) return `${subj.icon || ''} ${subj.nameFr}`;
  }
  if (field === 'classId' && value && currentData.classes) {
    const cls = currentData.classes.find((c: any) => c.id === value);
    if (cls) return cls.nameFr;
  }
  if (field === 'sectionId' && value && currentData.sections) {
    const sec = currentData.sections.find((s: any) => s.id === value);
    if (sec) return sec.nameFr;
  }
  if (field === 'type') return TYPE_LABELS[value] || value;
  if (field === 'language') return value === 'ar' ? 'Arabe' : value === 'fr+ar' ? 'FR + AR' : 'Français';
  if (field === 'trimester') return value ? `T${value}` : '—';
  if (value === null || value === '') return '(vide)';
  return String(value);
}

export default async function PendingEditsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');
  if (user.role !== 'ADMIN') redirect('/');

  const [pendingEdits, recentlyRejected, subjects, classes, sections] = await Promise.all([
    prisma.resource.findMany({
      where: { editStatus: 'PENDING_EDIT_APPROVAL' },
      orderBy: { editRequestedAt: 'desc' },
      include: {
        subject: true,
        editRequestedBy: { select: { id: true, firstName: true, lastName: true, schoolName: true } },
      },
    }),
    prisma.resource.findMany({
      where: { editStatus: 'EDIT_REJECTED' },
      orderBy: { editReviewedAt: 'desc' },
      take: 5,
      include: { subject: true, editRequestedBy: { select: { firstName: true, lastName: true } } },
    }),
    prisma.subject.findMany({ select: { id: true, nameFr: true, icon: true } }),
    prisma.class.findMany({ select: { id: true, nameFr: true } }),
    prisma.section.findMany({ select: { id: true, nameFr: true } }),
  ]);

  const lookupData = { subjects, classes, sections };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">✏️ Modifications en attente</h1>
          <p className="text-slate-500 mt-1">
            Approuvez ou refusez les modifications proposées par les enseignants.
          </p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-extrabold text-blue-600">{pendingEdits.length}</div>
          <div className="text-xs text-slate-500">en attente</div>
        </div>
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
        <div className="space-y-3">
          {pendingEdits.map(r => {
            const pending = (r.pendingEdit as any) || {};
            const changes = Object.keys(pending).filter(k => !['fileKey', 'fileUrl'].includes(k));
            const hasNewFile = !!pending.fileKey;
            const teacherName = r.editRequestedBy ? `${r.editRequestedBy.firstName} ${r.editRequestedBy.lastName}` : 'Inconnu';
            const waited = r.editRequestedAt ? Math.floor((Date.now() - new Date(r.editRequestedAt).getTime()) / 3600000) : 0;
            const isUrgent = waited > 72;

            return (
              <div key={r.id} className={`bg-white rounded-2xl border-2 ${isUrgent ? 'border-amber-300' : 'border-slate-200'} p-5`}>
                {/* Compact header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {teacherName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/ressources/${r.slug}`} target="_blank" className="font-bold text-slate-900 hover:text-primary-600 truncate">
                        {r.title}
                      </Link>
                      {isUrgent && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full flex-shrink-0">
                          ⚠️ {waited}h
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-semibold text-slate-700">{teacherName}</span>
                      {r.editRequestedBy?.schoolName && <span>· {r.editRequestedBy.schoolName}</span>}
                      <span>·</span>
                      <Clock className="w-3 h-3" />
                      {r.editRequestedAt && timeAgo(r.editRequestedAt)}
                    </div>
                  </div>
                </div>

                {/* COMPACT CHANGES - just what changed, no big table */}
                {(changes.length > 0 || hasNewFile) && (
                  <div className="bg-slate-50 rounded-lg p-3 mb-3 space-y-1.5">
                    {changes.length > 0 && (
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        {changes.length} modification{changes.length > 1 ? 's' : ''} :
                      </div>
                    )}
                    {changes.map(field => {
                      const oldVal = (r as any)[field];
                      const newVal = pending[field];
                      return (
                        <div key={field} className="flex items-center gap-2 text-sm">
                          <span className="text-[10px] font-bold text-slate-500 uppercase w-20 flex-shrink-0">
                            {FIELD_LABELS[field] || field}
                          </span>
                          <span className="text-slate-400 line-through text-xs truncate max-w-[40%]">
                            {getFieldLabel(field, oldVal, lookupData)}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="font-semibold text-slate-900 text-sm truncate">
                            {getFieldLabel(field, newVal, lookupData)}
                          </span>
                        </div>
                      );
                    })}
                    {hasNewFile && (
                      <div className="flex items-center gap-2 text-sm pt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase w-20 flex-shrink-0">Fichier</span>
                        <FileText className="w-4 h-4 text-purple-600" />
                        <a href={pending.fileUrl} target="_blank" rel="noreferrer" className="font-semibold text-purple-700 hover:underline">
                          📎 Nouveau PDF →
                        </a>
                      </div>
                    )}
                  </div>
                )}

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
