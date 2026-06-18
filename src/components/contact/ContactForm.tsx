'use client';
import { useState } from 'react';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de l\'envoi');
        return;
      }

      setSent(true);
      toast.success('Message envoyé ! Nous vous répondrons rapidement.');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {sent && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-bold text-emerald-900 mb-1">Message envoyé !</div>
            <div className="text-emerald-700">
              Nous vous répondrons sous 24-48h ouvrés.
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nom complet *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="Votre nom"
            />
          </div>
          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="input"
              placeholder="vous@exemple.com"
            />
          </div>
        </div>

        <div>
          <label className="label">Sujet</label>
          <select
            value={form.subject}
            onChange={e => setForm({ ...form, subject: e.target.value })}
            className="input"
          >
            <option value="">-- Choisir un sujet --</option>
            <option value="question">Question générale</option>
            <option value="bug">Signaler un bug</option>
            <option value="teacher">Devenir enseignant</option>
            <option value="partnership">Partenariat</option>
            <option value="copyright">Droit d'auteur (DMCA)</option>
            <option value="other">Autre</option>
          </select>
        </div>

        <div>
          <label className="label">Message *</label>
          <textarea
            required
            value={form.message}
            onChange={e => setForm({ ...form, message: e.target.value })}
            rows={6}
            className="input resize-none"
            placeholder="Décrivez votre demande en détail..."
          />
          <div className="text-xs text-slate-500 mt-1 text-right">
            {form.message.length} / 2000
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>RGPD :</strong> Vos données ne sont utilisées que pour vous répondre.
            Voir nos <a href="/cgu" className="underline font-semibold">CGU</a>.
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full sm:w-auto px-8 py-3 inline-flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Envoyer le message
            </>
          )}
        </button>
      </form>
    </>
  );
}