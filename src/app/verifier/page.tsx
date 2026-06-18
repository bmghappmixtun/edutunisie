'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const redirectTo = searchParams.get('redirect') || '/mon-compte';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (initialEmail) inputRefs.current[0]?.focus();
  }, [initialEmail]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function handleCodeChange(index: number, value: string) {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-advance
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && code.every(c => c)) {
      verify();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  }

  async function verify() {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      toast.error('Veuillez entrer les 6 chiffres');
      return;
    }
    if (!email) {
      toast.error('Email requis');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode })
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Code invalide');
        // Clear code on error
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }

      toast.success(data.message || 'Vérifié !');

      // Redirect based on status
      setTimeout(() => {
        if (data.status === 'ACTIVE') {
          router.push(redirectTo);
        } else if (data.status === 'PENDING_APPROVAL') {
          router.push('/en-attente');
        } else {
          router.push('/connexion');
        }
      }, 800);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (resendCooldown > 0 || !email) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success('Nouveau code envoyé !');
      setResendCooldown(30);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>

        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-8 text-center text-white">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold mb-1">Vérifiez votre email</h1>
            <p className="text-primary-100 text-sm">
              Entrez le code à 6 chiffres envoyé à votre adresse
            </p>
          </div>

          <div className="p-8">
            {/* Email field (editable if not pre-filled) */}
            <div className="mb-6">
              <label className="label">Votre email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="input"
                disabled={!!initialEmail}
              />
            </div>

            {/* 6-digit code input */}
            <div className="mb-6">
              <label className="label">Code de vérification</label>
              <div className="flex gap-2 justify-between" onPaste={handlePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleCodeChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    disabled={loading}
                    className="w-12 h-14 text-center text-2xl font-extrabold border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition disabled:opacity-50"
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                Vous pouvez coller le code directement
              </p>
            </div>

            <button
              onClick={verify}
              disabled={loading || code.join('').length !== 6 || !email}
              className="btn-primary w-full flex items-center justify-center gap-2 mb-4"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Vérifier
            </button>

            {/* Resend */}
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-2">Vous n'avez pas reçu le code ?</p>
              <button
                onClick={resend}
                disabled={resendCooldown > 0 || loading || !email}
                className="text-sm font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                {resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : 'Renvoyer le code'}
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Code valide 10 minutes · Max 5 tentatives
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Vous avez déjà un compte ?{' '}
          <Link href="/connexion" className="text-primary-600 font-semibold hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    }>
      <VerifyOtpForm />
    </Suspense>
  );
}