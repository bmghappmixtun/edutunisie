'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import OAuthButtons from '@/components/auth/OAuthButtons';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'STUDENT' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  function update(key: string, val: string) { setForm(prev => ({ ...prev, [key]: val })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Mot de passe trop court'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success('Compte créé ! Vérifiez votre email.');
      // Always go to OTP verification (both students and teachers)
      if (data.requiresVerification) {
        router.push(`/verifier?email=${encodeURIComponent(form.email)}`);
      } else {
        router.push('/connexion');
      }
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-sky-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold">Inscription gratuite</h1>
          <p className="text-slate-500 mt-1">Rejoignez +30 000 élèves et enseignants</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 lg:p-8 shadow-xl border border-slate-100">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Prénom *</label>
              <input type="text" required value={form.firstName} onChange={e => update('firstName', e.target.value)} className="input" placeholder="Prénom" />
            </div>
            <div>
              <label className="label">Nom *</label>
              <input type="text" value={form.lastName} onChange={e => update('lastName', e.target.value)} className="input" placeholder="Nom" />
            </div>
          </div>
          <div className="mb-4">
            <label className="label">Email *</label>
            <input type="email" required value={form.email} onChange={e => update('email', e.target.value)} className="input" placeholder="votre@email.com" />
          </div>
          <div className="mb-4">
            <label className="label">Mot de passe *</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={e => update('password', e.target.value)} className="input pr-10" placeholder="Min. 6 caractères" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="mb-6">
            <label className="label">Vous êtes ?</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'STUDENT', label: '👨‍🎓 Élève', desc: 'Je cherche des ressources' },
                { value: 'TEACHER', label: '👨‍🏫 Enseignant', desc: 'Je partage mes cours' },
              ].map(r => (
                <button key={r.value} type="button" onClick={() => update('role', r.value)} className={`p-3 rounded-xl border-2 text-left transition ${form.role === r.value ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="font-bold text-sm">{r.label}</div>
                  <div className="text-xs text-slate-500">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>

          <OAuthButtons />
          <p className="text-xs text-slate-400 text-center mt-3">
            En vous inscrivant, vous acceptez nos <a href="#" className="underline">CGU</a> et notre <a href="#" className="underline">politique de confidentialité</a>.
          </p>
        </form>

        <p className="text-center mt-6 text-sm text-slate-500">
          Déjà inscrit ? <Link href="/connexion" className="text-primary-600 font-semibold hover:underline">Connectez-vous</Link>
        </p>
      </div>
    </div>
  );
}
