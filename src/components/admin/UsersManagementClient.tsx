'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Search, UserCheck, UserX, Trash2, Shield, CheckCircle2, Ban,
  GraduationCap, Users, MoreHorizontal, ChevronDown, X, AlertTriangle,
  CheckSquare, Square, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import DeleteUserButton from './DeleteUserButton';

type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  status: string;
  isVerifiedTeacher: boolean;
  schoolName: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  _count?: { uploadedFiles?: number };
};

type Counts = {
  TEACHER: number;
  STUDENT: number;
  ADMIN: number;
  TOTAL: number;
};

const TABS = [
  { value: 'TEACHER', label: 'Enseignants', icon: GraduationCap, color: 'amber' },
  { value: 'STUDENT', label: 'Élèves', icon: Users, color: 'sky' },
  { value: 'ADMIN', label: 'Administrateurs', icon: Shield, color: 'red' },
] as const;

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  TEACHER: 'bg-amber-100 text-amber-700',
  STUDENT: 'bg-blue-100 text-blue-700',
};
const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  PENDING_OTP: 'bg-orange-100 text-orange-700',
  SUSPENDED: 'bg-slate-200 text-slate-700',
  BANNED: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  PENDING_APPROVAL: 'En attente',
  PENDING_OTP: 'OTP',
  SUSPENDED: 'Suspendu',
  BANNED: 'Banni',
};

function formatBytes(bytes?: number): string {
  if (!bytes) return '—';
  return '—'; // we don't have storage info here
}

export default function UsersManagementClient({
  initialUsers,
  initialCounts,
  initialRole,
  initialSearch,
  initialPage,
  initialPageSize,
  totalFiltered,
}: {
  initialUsers: User[];
  initialCounts: Counts;
  initialRole: string;
  initialSearch: string;
  initialPage: number;
  initialPageSize: number;
  totalFiltered: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [counts, setCounts] = useState<Counts>(initialCounts);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [activeTab, setActiveTab] = useState<string>(initialRole);
  const [search, setSearch] = useState<string>(initialSearch);
  const [page, setPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [total, setTotal] = useState<number>(totalFiltered);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ action: string; title: string; description: string } | null>(null);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  // Sync state with props when parent re-renders (e.g. after router.push triggers SSR re-fetch)
  useEffect(() => {
    setCounts(initialCounts);
    setUsers(initialUsers);
  }, [initialCounts, initialUsers]);

  useEffect(() => {
    setPage(initialPage);
    setPageSize(initialPageSize);
    setTotal(totalFiltered);
  }, [initialPage, initialPageSize, totalFiltered]);

  // Sync local state from URL when navigation happens
  useEffect(() => {
    const r = searchParams.get('role') || 'TEACHER';
    const q = searchParams.get('q') || '';
    const p = parseInt(searchParams.get('page') || '1');
    const s = parseInt(searchParams.get('size') || '25');
    setActiveTab(r);
    setSearch(q);
    setPage(p);
    setPageSize(s);
  }, [searchParams]);

  // Filter displayed users by tab + search
  const filteredUsers = useMemo(() => {
    return users.filter((u) => u.role === activeTab);
  }, [users, activeTab]);

  const selectedInTab = filteredUsers.filter((u) => selected.has(u.id));

  function toggleUser(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAllInTab() {
    const allIds = filteredUsers.map((u) => u.id);
    const allSelected = allIds.every((id) => selected.has(id));
    const next = new Set(selected);
    if (allSelected) {
      allIds.forEach((id) => next.delete(id));
    } else {
      allIds.forEach((id) => next.add(id));
    }
    setSelected(next);
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function navigate(tab: string, q?: string, newPage = 1, newSize?: number) {
    clearSelection();
    const params = new URLSearchParams();
    params.set('role', tab);
    if (q) params.set('q', q);
    params.set('page', String(newPage));
    if (newSize) params.set('size', String(newSize));
    else if (pageSize) params.set('size', String(pageSize));
    router.push(`/admin/utilisateurs?${params.toString()}`);
  }

  function goToPage(p: number) {
    navigate(activeTab, search, p);
  }

  function changePageSize(s: number) {
    navigate(activeTab, search, 1, s);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(activeTab, search);
  }

  async function performBulkAction(action: string, options: { title: string; description: string }) {
    if (selected.size === 0) {
      toast.error('Aucun utilisateur sélectionné');
      return;
    }
    setConfirmAction({ action, ...options });
  }

  async function executeBulkAction() {
    if (!confirmAction) return;
    const { action } = confirmAction;
    setBulkLoading(true);
    try {
      const res = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userIds: Array.from(selected),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur');
        if (data.adminIds) {
          toast.error('Impossible d\'agir sur des administrateurs');
        }
        return;
      }
      if (data.success) {
        toast.success(`✅ ${data.succeeded} utilisateur(s) traité(s)`);
      } else {
        toast(`${data.succeeded} réussi(s), ${data.failed} échec(s)`, { icon: '⚠️' });
      }
      // Refresh the page (router.push + router.refresh to force SSR data re-fetch)
      navigate(activeTab, search);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setBulkLoading(false);
      setConfirmAction(null);
    }
  }

  const tab = TABS.find((t) => t.value === activeTab) || TABS[0];

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">👥 Gestion des utilisateurs</h1>
      <p className="text-slate-500 mb-6">{counts.TOTAL} utilisateurs au total</p>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1 mb-4 flex gap-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const count = counts[t.value];
          const isActive = activeTab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => navigate(t.value, search)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition ${
                isActive
                  ? `bg-gradient-to-br from-${t.color}-500 to-${t.color}-600 text-white shadow-md`
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl p-3 border border-slate-200 flex gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 px-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Rechercher parmi les ${tab.label.toLowerCase()}...`}
            className="flex-1 bg-transparent outline-none text-sm"
          />
          {search && (
            <button type="button" onClick={() => { setSearch(''); navigate(activeTab, ''); }}>
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>
        <button type="submit" className="btn-primary text-sm">
          Rechercher
        </button>
      </form>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-gradient-to-r from-primary-50 to-cyan-50 border-2 border-primary-200 rounded-2xl p-4 mb-4 flex items-center justify-between flex-wrap gap-3 animate-in slide-in-from-top">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold">
              {selected.size}
            </div>
            <div>
              <div className="font-bold text-slate-900">
                {selected.size} utilisateur{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}
              </div>
              <div className="text-xs text-slate-600">
                Action de masse sur l'onglet {tab.label.toLowerCase()}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {activeTab === 'TEACHER' && (
              <>
                <button
                  onClick={() => performBulkAction('verify', { title: 'Vérifier les profs', description: 'Donner le badge ✓ aux profs sélectionnés.' })}
                  disabled={bulkLoading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-600 transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Vérifier
                </button>
                <button
                  onClick={() => performBulkAction('unverify', { title: 'Retirer la vérification', description: 'Retirer le badge ✓ aux profs sélectionnés.' })}
                  disabled={bulkLoading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-500 text-white text-sm font-semibold rounded-lg hover:bg-slate-600 transition disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" /> Dé-vérifier
                </button>
              </>
            )}
            <button
              onClick={() => performBulkAction('activate', { title: 'Réactiver', description: 'Remettre les comptes en ACTIVE.' })}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-600 transition disabled:opacity-50"
            >
              <UserCheck className="w-3.5 h-3.5" /> Activer
            </button>
            <button
              onClick={() => performBulkAction('suspend', { title: 'Suspendre', description: 'Suspendre temporairement les comptes.' })}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition disabled:opacity-50"
            >
              <UserX className="w-3.5 h-3.5" /> Suspendre
            </button>
            <button
              onClick={() => performBulkAction('ban', { title: 'Bannir', description: 'Bannir définitivement les comptes.' })}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition disabled:opacity-50"
            >
              <Ban className="w-3.5 h-3.5" /> Bannir
            </button>
            <button
              onClick={() => performBulkAction('delete', {
                title: 'Supprimer DÉFINITIVEMENT',
                description: `Supprimer définitivement ${selected.size} utilisateur(s) et TOUTES leurs données (ressources, commentaires, fichiers bibliothèque, messages, etc.). ATTENTION : action irréversible.`,
              })}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-700 text-white text-sm font-bold rounded-lg hover:bg-red-800 transition disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Supprimer
            </button>
            <button
              onClick={clearSelection}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition"
            >
              <X className="w-3.5 h-3.5" /> Annuler
            </button>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 text-sm text-slate-500 flex items-center justify-between">
          <span>
            {total === 0
              ? `0 ${tab.label.toLowerCase()} trouvé${total > 1 ? 's' : ''}`
              : `${startIndex}–${endIndex} sur ${total} ${tab.label.toLowerCase()}`}
          </span>
          {filteredUsers.length > 0 && (
            <button
              onClick={toggleAllInTab}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              {filteredUsers.every((u) => selected.has(u.id)) ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Tout sélectionner
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={filteredUsers.length > 0 && filteredUsers.every((u) => selected.has(u.id))}
                    onChange={toggleAllInTab}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary"
                  />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Utilisateur</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Statut</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Inscription</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Dernier login</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, i) => {
                const isSelected = selected.has(u.id);
                return (
                  <tr
                    key={u.id}
                    className={`border-t border-slate-50 hover:bg-slate-50 transition ${i % 2 === 0 ? '' : 'bg-slate-50/30'} ${isSelected ? 'bg-primary-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleUser(u.id)}
                        disabled={u.role === 'ADMIN'}
                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary disabled:opacity-30"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          u.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                          u.role === 'TEACHER' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {(u.firstName?.[0] || u.email[0]).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold flex items-center gap-1">
                            {u.firstName} {u.lastName}
                            {u.role === 'TEACHER' && u.isVerifiedTeacher && (
                              <span className="text-blue-500" title="Enseignant vérifié">✓</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{u.email}</div>
                          {u.schoolName && <div className="text-xs text-slate-400">{u.schoolName}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-bold rounded ${statusColors[u.status] || 'bg-slate-100 text-slate-700'}`}>
                        {STATUS_LABELS[u.status] || u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{timeAgo(u.createdAt)}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 items-center justify-end">
                        {u.role !== 'ADMIN' && (
                          <form action={`/api/admin/users/${u.id}/toggle-status`} method="POST">
                            <button
                              className="p-1.5 hover:bg-slate-100 rounded"
                              title={u.status === 'ACTIVE' ? 'Suspendre' : 'Réactiver'}
                            >
                              {u.status === 'ACTIVE' ? (
                                <UserX className="w-4 h-4 text-amber-500" />
                              ) : (
                                <UserCheck className="w-4 h-4 text-emerald-500" />
                              )}
                            </button>
                          </form>
                        )}
                        <DeleteUserButton
                          userId={u.id}
                          userName={`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email}
                          isAdmin={u.role === 'ADMIN'}
                          resourcesCount={u._count?.uploadedFiles || 0}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="p-12 text-center">
            <div className="text-5xl mb-3 opacity-50">{tab.icon && <tab.icon className="w-12 h-12 mx-auto text-slate-300" />}</div>
            <h3 className="text-lg font-bold text-slate-700">Aucun {tab.label.toLowerCase()} trouvé</h3>
            <p className="text-sm text-slate-500 mt-1">
              {search ? 'Essayez une autre recherche.' : 'Aucun utilisateur dans cette catégorie pour le moment.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination footer */}
      {total > 0 && (
        <div className="mt-4 bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between flex-wrap gap-3">
          {/* Page size selector */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Afficher par</span>
            <div className="flex gap-1">
              {[10, 25, 50, 100].map((s) => (
                <button
                  key={s}
                  onClick={() => changePageSize(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                    pageSize === s
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Page info + nav */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-600">
              Page <strong>{page}</strong> sur <strong>{totalPages}</strong>
            </span>
            <div className="flex gap-1 ml-2">
              <button
                onClick={() => goToPage(1)}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Première page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Page précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers (smart sliding window) */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition ${
                      page === pageNum
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Page suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={page >= totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Dernière page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                confirmAction.action === 'delete' || confirmAction.action === 'ban'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-amber-100 text-amber-600'
              }`}>
                {confirmAction.action === 'delete' || confirmAction.action === 'ban' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <CheckCircle2 className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">{confirmAction.title}</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Vous allez affecter <strong>{selected.size}</strong> utilisateur{selected.size > 1 ? 's' : ''}.
                </p>
                <p className="text-sm text-slate-500 mt-2">{confirmAction.description}</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={bulkLoading}
                className="px-4 py-2 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={executeBulkAction}
                disabled={bulkLoading}
                className={`px-4 py-2 rounded-lg font-semibold text-white transition disabled:opacity-50 ${
                  confirmAction.action === 'delete' || confirmAction.action === 'ban'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {bulkLoading ? '⏳ Traitement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}