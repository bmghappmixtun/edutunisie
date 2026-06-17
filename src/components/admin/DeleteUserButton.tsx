'use client';
import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DeleteUserButton({
  userId,
  userName,
  isAdmin
}: {
  userId: string;
  userName: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAdmin) {
    return (
      <span title="Impossible de supprimer un admin" className="text-xs text-slate-300 cursor-not-allowed">
        🛡️
      </span>
    );
  }

  async function handleDelete() {
    if (confirmText !== 'SUPPRIMER') {
      toast.error('Tapez SUPPRIMER en majuscules pour confirmer');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/delete`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur');
        return;
      }
      toast.success(`${userName} supprimé`);
      // Reload page
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Supprimer définitivement"
        className="p-1.5 hover:bg-red-50 rounded text-red-500 hover:text-red-700 transition"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={() => !loading && setOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">Supprimer définitivement</h3>
                <p className="text-sm text-slate-600">
                  Cette action est <strong>irréversible</strong>. L'utilisateur <strong>{userName}</strong> et toutes ses données (ressources, commentaires, notes) seront supprimés.
                </p>
              </div>
              <button onClick={() => setOpen(false)} disabled={loading} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-800">
                ⚠️ Pour confirmer, tape <strong className="font-mono">SUPPRIMER</strong> en majuscules ci-dessous :
              </p>
            </div>

            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="SUPPRIMER"
              className="input mb-4 font-mono"
              autoComplete="off"
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 font-semibold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || confirmText !== 'SUPPRIMER'}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}