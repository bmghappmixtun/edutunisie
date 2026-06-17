'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import OAuthButtons from '@/components/auth/OAuthButtons';
import { useI18n } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || t('auth.invalidCredentials')); return; }
      toast.success('Bienvenue ! 🎉');
      if (data.user.role === 'ADMIN') router.push('/admin');
      else if (data.user.role === 'TEACHER') router.push('/enseignant');
      else router.push('/mon-compte');
    } catch { toast.error(t('common.error')); }
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
          <h1 className="text-2xl font-extrabold">{t('auth.loginTitle')}</h1>
          <p className="text-slate-500 mt-1">{t('auth.loginSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 lg:p-8 shadow-xl border border-slate-100">
          <div className="mb-4">
            <label className="label">{t('auth.email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input" placeholder="votre@email.com" />
          </div>
          <div className="mb-6">
            <label className="label">{t('auth.password')}</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required className="input pr-10" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
            {loading ? '...' : t('auth.loginButton')}
          </button>

          <OAuthButtons />

          <div className="text-center mt-4">
            <Link href="/mot-de-passe-oublie" className="text-sm text-primary-600 hover:underline">{t('auth.forgotPassword')}</Link>
          </div>
        </form>

        <p className="text-center mt-6 text-sm text-slate-500">
          {t('auth.noAccount')} <Link href="/inscription" className="text-primary-600 font-semibold hover:underline">{t('auth.signupNow')}</Link>
        </p>

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
          <p className="font-bold text-amber-800 mb-2">{t('auth.demoAccounts')}</p>
          <div className="space-y-1 text-amber-700 font-mono text-xs">
            <div>Admin : admin@edutunisie.tn / demo1234</div>
            <div>Enseignant : ahmed.benali@edutunisie.tn / demo1234</div>
            <div>Élève : yassine@example.com / demo1234</div>
          </div>
        </div>
      </div>
    </div>
  );
}