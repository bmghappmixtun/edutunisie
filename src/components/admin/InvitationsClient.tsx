'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Mail, Send, Clock, CheckCircle2, XCircle, Eye, RotateCcw, Ban,
  ChevronLeft, ArrowLeft, Filter, Globe, Activity, UserCheck, AlertTriangle,
  Search, X
} from 'lucide-react';
import { timeAgo } from '@/lib/utils';

type Invitation = {
  id: string;
  token: string;
  email: string;
  status: string;
  createdAt: string;
  emailSentAt: string | null;
  linkClickedAt: string | null;
  activatedAt: string | null;
  cancelledAt: string | null;
  expiresAt: string;
  clickCount: number;
  clickIpAddress: string | null;
  activateIpAddress: string | null;
  customMessage: string | null;
  teacher: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    _count?: { uploadedFiles?: number };
  };
  invitedBy: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
};

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:   { label: 'En attente',    color: 'bg-slate-100 text-slate-700',    icon: <Clock className="w-3.5 h-3.5" /> },
  SENT:      { label: 'Envoyée',       color: 'bg-sky-100 text-sky-700',        icon: <Send className="w-3.5 h-3.5" /> },
  CLICKED:   { label: 'Lien cliqué',   color: 'bg-amber-100 text-amber-700',    icon: <Eye className="w-3.5 h-3.5" /> },
  ACTIVATED: { label: '✅ Activée',     color: 'bg-emerald-100 text-emerald-700',icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  EXPIRED:   { label: 'Expirée',       color: 'bg-rose-100 text-rose-700',      icon: <XCircle className="w-3.5 h-3.5" /> },
  CANCELLED: { label: 'Annulée',       color: 'bg-rose-100 text-rose-700',      icon: <Ban className="w-3.5 h-3.5" /> },
};

export default function InvitationsClient({ initialInvitations, initialStats }: { initialInvitations: Invitation[]; initialStats: Record<string, number> }) {
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [stats, setStats] = useState(initialStats);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = invitations;
    if (filterStatus) {
      result = result.filter(inv => inv.status === filterStatus);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(inv =>
        inv.email.toLowerCase().includes(q) ||
        `${inv.teacher.firstName || ''} ${inv.teacher.lastName || ''}`.toLowerCase().includes(q) ||
        inv.teacher.email.toLowerCase().includes(q)
      );
    }
    return result;
  }, [invitations, filterStatus, search]);

  const totals = useMemo(() => {
    const total = Object.values(stats).reduce((s, n) => s + n, 0);
    return {
      total,
      activated: stats.ACTIVATED || 0,
      pending: (stats.PENDING || 0) + (stats.SENT || 0) + (stats.CLICKED || 0),
      expired: stats.EXPIRED || 0,
      conversionRate: total > 0 ? Math.round(((stats.ACTIVATED || 0) / total) * 100) : 0,
    };
  }, [stats]);

  async function refresh() {
    const res = await fetch('/api/admin/invitations');
    const data = await res.json();
    if (res.ok) {
      setInvitations(data.invitations);
      setStats(data.stats);
    }
  }

  async function resend(id: string) {
    if (!confirm('Renvoyer cette invitation avec un nouveau mot de passe ?')) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/invitations/${id}/resend`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur');
      } else {
        toast.success('✅ Invitation renvoyée');
        await refresh();
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function cancel(id: string) {
    if (!confirm('Annuler cette invitation ? Le compte sera désactivé.')) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/invitations/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur');
      } else {
        toast.success('Invitation annulée');
        await refresh();
      }
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/utilisateurs"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à la gestion des utilisateurs
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold mb-1 flex items-center gap-2">
              <Mail className="w-6 h-6 text-sky-600" />
              Invitations enseignants
            </h1>
            <p className="text-slate-500 text-sm">
              Suivi des invitations envoyées aux profs importés de devoirat.net et JotForm
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard icon={<Activity className="w-5 h-5" />} color="slate" label="Total" value={totals.total} />
        <StatCard icon={<Clock className="w-5 h-5" />} color="amber" label="En cours" value={totals.pending} />
        <StatCard icon={<UserCheck className="w-5 h-5" />} color="emerald" label="Activées" value={totals.activated} />
        <StatCard icon={<XCircle className="w-5 h-5" />} color="rose" label="Expirées" value={totals.expired} />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} color="sky" label="Conversion" value={`${totals.conversionRate}%`} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_META).map(([key, m]) => (
              <option key={key} value={key}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status filter chips (visual) */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(STATUS_META).map(([key, m]) => {
          const count = stats[key] || 0;
          const isActive = filterStatus === key;
          return (
            <button
              key={key}
              onClick={() => setFilterStatus(isActive ? '' : key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md'
                  : `${m.color} hover:opacity-80`
              }`}
            >
              {m.icon}
              {m.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${isActive ? 'bg-white/20 text-white' : 'bg-white/70 text-slate-700'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Invitations table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Professeur</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Statut</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Email envoyé</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Lien cliqué</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Activé</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Expire</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Fichiers</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => {
                const meta = STATUS_META[inv.status];
                const fileCount = inv.teacher._count?.uploadedFiles || 0;
                const expiresAt = new Date(inv.expiresAt);
                const isExpiringSoon = inv.status !== 'ACTIVATED' && inv.status !== 'EXPIRED' && inv.status !== 'CANCELLED' &&
                  (expiresAt.getTime() - Date.now()) < 2 * 24 * 3600 * 1000;
                return (
                  <tr key={inv.id} className={`border-t border-slate-50 hover:bg-slate-50 transition ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {(inv.teacher.firstName?.[0] || inv.teacher.email[0]).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">
                            {inv.teacher.firstName} {inv.teacher.lastName}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{inv.teacher.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded ${meta.color}`}>
                        {meta.icon} {meta.label}
                      </span>
                      {inv.clickCount > 1 && (
                        <div className="text-xs text-slate-400 mt-1">{inv.clickCount} clics</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                      {inv.emailSentAt ? (
                        <div>
                          <div>{timeAgo(inv.emailSentAt)}</div>
                          <div className="text-xs text-slate-400">{new Date(inv.emailSentAt).toLocaleDateString('fr-FR')}</div>
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                      {inv.linkClickedAt ? (
                        <div>
                          <div>{timeAgo(inv.linkClickedAt)}</div>
                          {inv.clickIpAddress && <div className="text-xs text-slate-400 truncate max-w-[120px]">{inv.clickIpAddress}</div>}
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                      {inv.activatedAt ? (
                        <div>
                          <div className="text-emerald-600 font-semibold">{timeAgo(inv.activatedAt)}</div>
                          {inv.activateIpAddress && <div className="text-xs text-slate-400 truncate max-w-[120px]">{inv.activateIpAddress}</div>}
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className={`text-xs ${isExpiringSoon ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                        {isExpiringSoon && '⚠️ '}{new Date(inv.expiresAt).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 text-xs font-extrabold rounded ${
                        fileCount > 50 ? 'bg-emerald-100 text-emerald-700' :
                        fileCount > 10 ? 'bg-sky-100 text-sky-700' :
                        fileCount > 0 ? 'bg-slate-100 text-slate-700' :
                        'bg-slate-50 text-slate-400'
                      }`}>
                        {fileCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 items-center justify-end">
                        {(inv.status === 'SENT' || inv.status === 'CLICKED' || inv.status === 'EXPIRED') && (
                          <button
                            onClick={() => resend(inv.id)}
                            disabled={loadingId === inv.id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 rounded transition disabled:opacity-50"
                            title="Renvoyer avec un nouveau mot de passe"
                          >
                            <RotateCcw className="w-3 h-3" /> Renvoyer
                          </button>
                        )}
                        {(inv.status === 'PENDING' || inv.status === 'SENT' || inv.status === 'CLICKED') && (
                          <button
                            onClick={() => cancel(inv.id)}
                            disabled={loadingId === inv.id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded transition disabled:opacity-50"
                          >
                            <Ban className="w-3 h-3" /> Annuler
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <Mail className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    Aucune invitation {filterStatus ? `avec le statut "${STATUS_META[filterStatus]?.label}"` : ''}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-4 text-xs text-slate-400 flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5" />
        Les invitations expirent automatiquement après 10 jours. Utilisez "Renvoyer" pour générer un nouveau lien + mot de passe.
      </div>
    </div>
  );
}

function StatCard({ icon, color, label, value }: { icon: React.ReactNode; color: string; label: string; value: number | string }) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700',
    sky: 'bg-sky-100 text-sky-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-8 h-8 rounded-lg ${colors[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
      </div>
      <div className="text-2xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}