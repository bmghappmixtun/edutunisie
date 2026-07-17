'use client';
import { useState, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  Loader2,
  CheckSquare,
  Square,
  Users,
  FileText,
  Filter,
  FolderOpen,
  Mail,
  Shield,
} from 'lucide-react';
import TeacherVerificationFilesViewer from '@/components/admin/TeacherVerificationFilesViewer';
import toast from 'react-hot-toast';

type Teacher = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  schoolName: string | null;
  governorate: string | null;
  diploma: string | null;
  teachingSubjects: string | null;
  teachingLevels: string | null;
  createdAt: string;
  status: string;
  invitationStatus?: string | null;
  lastInvitationId?: string | null;
  verificationFilesRequestedAt?: string | null;
  verificationFilesCount?: number;
  verificationFilesReceivedAt?: string | null;
};

type Resource = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  fileKey: string;
  fileUrl: string;
  subject: { nameFr: string };
  class: { nameFr: string } | null;
  teacher: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    schoolName: string | null;
  } | null;
  createdAt: string;
};

export default function ApprobationsClient({
  initialTeachers,
  initialResources,
}: {
  initialTeachers: Teacher[];
  initialResources: Resource[];
}) {
  const [tab, setTab] = useState<'teachers' | 'resources'>('resources'); // Default to resources since user wants files
  const [teachers, setTeachers] = useState(initialTeachers);
  const [resources, setResources] = useState(initialResources);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState<'approve' | 'reject' | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    ids: string[];
    isBulk: boolean;
    itemTitle?: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [search, setSearch] = useState('');
  const [fileRequestModal, setFileRequestModal] = useState<{ teacher: Teacher } | null>(null);
  const [fileRequestNote, setFileRequestNote] = useState('');

  const currentList = tab === 'teachers' ? teachers : resources;
  const filteredList = useMemo(() => {
    if (!search.trim()) return currentList;
    const q = search.toLowerCase();
    return currentList.filter((item) => {
      const str = JSON.stringify(item).toLowerCase();
      return str.includes(q);
    });
  }, [currentList, search]);

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleSelectAll() {
    if (selected.size === filteredList.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredList.map((i) => i.id)));
    }
  }

  async function handleSingle(id: string, action: 'approve' | 'reject') {
    if (action === 'reject' && tab === 'resources') {
      const item = resources.find((r) => r.id === id);
      setRejectModal({ ids: [id], isBulk: false, itemTitle: item?.title });
      setRejectReason('');
      return;
    }
    setLoading(`${id}-${action}`);
    try {
      const type = tab === 'teachers' ? 'teacher' : 'resource';
      const res = await fetch(`/api/admin/${type}/${id}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur');
        return;
      }
      toast.success(action === 'approve' ? '✅ Approuvé' : '❌ Rejeté');
      // Remove from list
      if (tab === 'teachers') {
        setTeachers((ts) => ts.filter((t) => t.id !== id));
      } else {
        setResources((rs) => rs.filter((r) => r.id !== id));
      }
      setSelected((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    } catch (e) {
      toast.error('Erreur réseau');
    } finally {
      setLoading(null);
    }
  }

  async function confirmReject() {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      toast.error('Le motif est obligatoire');
      return;
    }
    setBulkLoading('reject');
    try {
      const promises = rejectModal.ids.map((id) =>
        fetch(`/api/admin/resource/${id}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: rejectReason.trim() }),
        })
          .then((r) => r.json())
          .then((d) => ({ id, ok: d.success === true }))
          .catch(() => ({ id, ok: false })),
      );
      const results = await Promise.all(promises);
      const success = results.filter((r) => r.ok).length;
      const failed = results.length - success;
      if (success > 0)
        toast.success(`❌ ${success} rejeté(s)${failed > 0 ? `, ${failed} échec(s)` : ''}`);
      if (failed > 0) toast.error(`${failed} échec(s)`);
      // Remove rejected items from list
      setResources((rs) => rs.filter((r) => !results.find((x) => x.id === r.id && x.ok)));
      setSelected((s) => {
        const n = new Set(s);
        results.filter((x) => x.ok).forEach((x) => n.delete(x.id));
        return n;
      });
      setRejectModal(null);
      setRejectReason('');
    } catch (e) {
      toast.error('Erreur réseau');
    } finally {
      setBulkLoading(null);
    }
  }

  async function handleBulk(action: 'approve' | 'reject') {
    if (selected.size === 0) return;
    if (!confirm(`${action === 'approve' ? 'Approuver' : 'Rejeter'} ${selected.size} élément(s) ?`))
      return;

    setBulkLoading(action);
    const type = tab === 'teachers' ? 'teacher' : 'resource';
    const promises = Array.from(selected).map((id) =>
      fetch(`/api/admin/${type}/${id}/${action}`, { method: 'POST' })
        .then((r) => r.json())
        .then((d) => ({ id, ok: d.success === true }))
        .catch(() => ({ id, ok: false })),
    );

    const results = await Promise.all(promises);
    const successIds = results.filter((r) => r.ok).map((r) => r.id);
    const failCount = results.length - successIds.length;

    // Remove successful from list
    if (tab === 'teachers') {
      setTeachers((ts) => ts.filter((t) => !successIds.includes(t.id)));
    } else {
      setResources((rs) => rs.filter((r) => !successIds.includes(r.id)));
    }
    setSelected(new Set());
    setBulkLoading(null);

    if (failCount === 0) {
      toast.success(
        `✅ ${successIds.length} élément(s) ${action === 'approve' ? 'approuvé(s)' : 'rejeté(s)'} !`,
      );
    } else {
      toast.error(`${successIds.length} réussi, ${failCount} échoué(s)`);
    }
  }

  async function handleRequestFiles(teacher: Teacher, note: string | null) {
    setLoading(`${teacher.id}-request-files`);
    try {
      const res = await fetch(`/api/admin/teacher/${teacher.id}/request-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur');
        return;
      }
      toast.success(`📁 Demande envoyée à ${teacher.firstName} ${teacher.lastName}`);
      // Update teacher in list
      setTeachers((ts) =>
        ts.map((t) =>
          t.id === teacher.id
            ? {
                ...t,
                status: 'PENDING_FILE_VERIFICATION',
                verificationFilesRequestedAt: new Date().toISOString(),
              }
            : t,
        ),
      );
      setFileRequestModal(null);
      setFileRequestNote('');
    } catch (e) {
      toast.error('Erreur réseau');
    } finally {
      setLoading(null);
    }
  }

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => {
            setTab('resources');
            setSelected(new Set());
          }}
          className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition ${
            tab === 'resources'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Ressources ({resources.length})
        </button>
        <button
          onClick={() => {
            setTab('teachers');
            setSelected(new Set());
          }}
          className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition ${
            tab === 'teachers'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Enseignants ({teachers.length})
        </button>
      </div>

      {/* Search + Bulk actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 sticky top-16 bg-slate-50/95 backdrop-blur z-10 py-3 -mx-4 px-4 border-b border-slate-200">
        <div className="flex-1 relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Filtrer ${tab === 'teachers' ? 'les enseignants' : 'les ressources'}...`}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {selected.size > 0 && (
          <div className="flex gap-2 animate-in fade-in slide-in-from-right-2">
            <span className="px-3 py-2 bg-primary-100 text-primary-700 rounded-xl text-sm font-semibold flex items-center">
              {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
            </span>
            <button
              onClick={() => handleBulk('approve')}
              disabled={bulkLoading !== null}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {bulkLoading === 'approve' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Tout approuver
            </button>
            <button
              onClick={() => handleBulk('reject')}
              disabled={bulkLoading !== null}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {bulkLoading === 'reject' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Tout rejeter
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl"
            >
              Annuler
            </button>
          </div>
        )}
      </div>

      {/* List */}
      {filteredList.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
          <p className="font-semibold text-emerald-800 text-lg">
            {currentList.length === 0
              ? tab === 'teachers'
                ? 'Aucun enseignant en attente'
                : 'Aucune ressource en attente'
              : 'Aucun résultat pour cette recherche'}
          </p>
          {currentList.length === 0 && (
            <p className="text-sm text-emerald-700 mt-1">Tout est à jour ! 🎉</p>
          )}
        </div>
      ) : (
        <>
          {/* Select all */}
          <div className="flex items-center gap-2 mb-3 px-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              {selected.size === filteredList.length ? (
                <CheckSquare className="w-5 h-5 text-primary-500" />
              ) : (
                <Square className="w-5 h-5" />
              )}
              {selected.size === filteredList.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
          </div>

          <div className="space-y-3">
            {filteredList.map((item) => {
              const isTeacher = tab === 'teachers';
              const t = item as Teacher;
              const r = item as Resource;
              const isSelected = selected.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border-2 p-4 transition ${
                    isSelected
                      ? 'border-primary-400 bg-primary-50/30 shadow-md'
                      : isTeacher
                        ? 'border-amber-200 hover:border-amber-300'
                        : 'border-orange-200 hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button onClick={() => toggleSelect(item.id)} className="mt-1 flex-shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-primary-500" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {isTeacher ? (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-bold flex items-center justify-center flex-shrink-0">
                              {t.firstName?.[0]}
                              {t.lastName?.[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold truncate">
                                {t.firstName} {t.lastName}
                              </div>
                              <div className="text-xs text-slate-500 truncate">{t.email}</div>
                            </div>
                            {/* Status badge */}
                            {t.lastInvitationId || t.invitationStatus ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex-shrink-0">
                                <Mail className="w-3 h-3" /> Invité
                              </span>
                            ) : t.status === 'PENDING_FILE_VERIFICATION' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 flex-shrink-0">
                                <FolderOpen className="w-3 h-3" /> Fichiers demandés
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex-shrink-0">
                                Nouveau
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                            {t.schoolName && (
                              <div className="bg-slate-50 px-2 py-1 rounded">🏫 {t.schoolName}</div>
                            )}
                            {t.governorate && (
                              <div className="bg-slate-50 px-2 py-1 rounded">
                                📍 {t.governorate}
                              </div>
                            )}
                            {t.diploma && (
                              <div className="bg-slate-50 px-2 py-1 rounded">🎓 {t.diploma}</div>
                            )}
                            {t.teachingSubjects && (
                              <div className="bg-slate-50 px-2 py-1 rounded col-span-2 sm:col-span-3">
                                📚 {t.teachingSubjects}
                              </div>
                            )}
                            <div className="text-slate-400 px-2">⏱️ {formatDate(t.createdAt)}</div>
                            {t.verificationFilesRequestedAt && (
                              <div className="text-violet-600 px-2 col-span-2 sm:col-span-3 flex items-center gap-2 flex-wrap">
                                <span>
                                  📁 Demande envoyée {formatDate(t.verificationFilesRequestedAt)}
                                  {t.verificationFilesCount
                                    ? ` • ${t.verificationFilesCount} fichier(s) reçu(s)`
                                    : ' • en attente'}
                                </span>
                                {t.verificationFilesReceivedAt && (
                                  <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                    ✓ Complet
                                  </span>
                                )}
                                {t.verificationFilesCount && t.verificationFilesCount > 0 && (
                                  <TeacherVerificationFilesViewer teacherId={t.id} />
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start gap-2 mb-2">
                            <div className="w-10 h-12 bg-slate-100 rounded flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold truncate">{r.title}</div>
                              <div className="text-xs text-slate-500 truncate">
                                {r.subject?.nameFr} · {r.class?.nameFr} · {r.type}
                              </div>
                            </div>
                          </div>
                          {r.description && (
                            <p
                              className="text-sm text-slate-600 mb-2 line-clamp-2"
                              dangerouslySetInnerHTML={{ __html: r.description }}
                            />
                          )}
                          <div className="text-xs text-slate-500 flex flex-wrap gap-x-3">
                            <span>
                              👤 {r.teacher?.firstName} {r.teacher?.lastName}
                            </span>
                            {r.teacher?.schoolName && <span>🏫 {r.teacher.schoolName}</span>}
                            <span>⏱️ {formatDate(r.createdAt)}</span>
                          </div>
                          <a
                            href={r.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline mt-2"
                          >
                            👁️ Prévisualiser le fichier
                          </a>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleSingle(item.id, 'approve')}
                        disabled={loading !== null}
                        className="p-2 sm:px-3 sm:py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
                        title="Approuver"
                      >
                        {loading === `${item.id}-approve` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">Approuver</span>
                      </button>
                      <button
                        onClick={() => handleSingle(item.id, 'reject')}
                        disabled={loading !== null}
                        className="p-2 sm:px-3 sm:py-2 bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
                        title="Rejeter"
                      >
                        {loading === `${item.id}-reject` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">Rejeter</span>
                      </button>
                      {/* Request files button — only for non-invited teachers */}
                      {isTeacher && !t.lastInvitationId && !t.invitationStatus && (
                        <button
                          onClick={() => {
                            setFileRequestModal({ teacher: t });
                            setFileRequestNote('');
                          }}
                          disabled={loading !== null}
                          className="p-2 sm:px-3 sm:py-2 bg-violet-500 hover:bg-violet-600 text-white text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
                          title="Demander 5 fichiers de vérification"
                        >
                          {loading === `${item.id}-request-files` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FolderOpen className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline">Fichiers</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Reject reason modal */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setRejectModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-red-500 to-red-700 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl">
                  ❌
                </div>
                <div>
                  <h2 className="text-xl font-extrabold leading-tight">
                    Rejeter{' '}
                    {rejectModal.isBulk ? `${rejectModal.ids.length} ressource(s)` : 'la ressource'}
                  </h2>
                  {rejectModal.itemTitle && !rejectModal.isBulk && (
                    <p className="text-sm text-red-100 mt-1 line-clamp-1">
                      {rejectModal.itemTitle}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Motif du refus <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: Le fichier contient des erreurs de mise en page. Veuillez utiliser le format PDF et vérifier l'orthographe avant de re-soumettre."
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm focus:border-red-400 focus:ring-4 focus:ring-red-100 outline-none resize-none"
                rows={5}
                autoFocus
                maxLength={500}
              />
              <div className="text-xs text-slate-400 mt-1 text-right">
                {rejectReason.length}/500
              </div>
              <p className="text-xs text-slate-500 mt-3">
                💡 Le motif sera envoyé par email au prof et affiché dans sa bibliothèque.
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex gap-2 justify-end border-t border-slate-100">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                disabled={bulkLoading === 'reject'}
              >
                Annuler
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectReason.trim() || bulkLoading === 'reject'}
                className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-2"
              >
                {bulkLoading === 'reject' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Envoi...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" /> Confirmer le refus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILE REQUEST modal — for new non-invited teachers */}
      {fileRequestModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setFileRequestModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-violet-500 via-purple-600 to-amber-500 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl">
                  📁
                </div>
                <div>
                  <h2 className="text-xl font-extrabold leading-tight">
                    Demander 5 fichiers de vérification
                  </h2>
                  <p className="text-sm text-violet-100 mt-1">
                    {fileRequestModal.teacher.firstName} {fileRequestModal.teacher.lastName}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mb-4 text-sm text-violet-800">
                <Shield className="w-4 h-4 inline mr-1" />
                Cette action enverra un email au prof lui demandant de nous envoyer
                <strong> 5 fichiers Word/PDF d'exemple</strong> avec son nom et prénom.
                <br />
                <span className="text-xs text-violet-600 mt-1 block">
                  Le prof aura 7 jours pour répondre. Son statut passera à
                  <code className="mx-1 px-1 bg-white rounded">PENDING_FILE_VERIFICATION</code>.
                </span>
              </div>

              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Message personnalisé <span className="text-slate-400 font-normal">(optionnel)</span>
              </label>
              <textarea
                value={fileRequestNote}
                onChange={(e) => setFileRequestNote(e.target.value)}
                placeholder="Ex: Bienvenue ! Merci de nous envoyer 5 exemples de vos meilleurs cours/séries en français et en arabe. Mettez votre nom en pied de page de chaque fichier."
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm focus:border-violet-400 focus:ring-4 focus:ring-violet-100 outline-none resize-none"
                rows={5}
                maxLength={500}
              />
              <div className="text-xs text-slate-400 mt-1 text-right">
                {fileRequestNote.length}/500
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex gap-2 justify-end border-t border-slate-100">
              <button
                onClick={() => {
                  setFileRequestModal(null);
                  setFileRequestNote('');
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                disabled={loading?.endsWith('-request-files')}
              >
                Annuler
              </button>
              <button
                onClick={() =>
                  handleRequestFiles(fileRequestModal.teacher, fileRequestNote.trim() || null)
                }
                disabled={loading?.endsWith('-request-files')}
                className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-lg disabled:opacity-50 shadow-md flex items-center gap-2"
              >
                {loading?.endsWith('-request-files') ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Envoi...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" /> Envoyer la demande
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
