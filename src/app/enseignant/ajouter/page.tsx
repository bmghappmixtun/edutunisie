'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, FileText, Info, Loader2, BookOpen, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

const RESOURCE_TYPES = ['COURSE', 'HOMEWORK', 'EXERCISE', 'REVISION', 'EXAM', 'BAC_SUBJECT', 'CORRECTION', 'SUMMARY', 'OTHER'];
const TYPE_LABELS: Record<string, string> = {
  COURSE: 'Cours', HOMEWORK: 'Devoir', EXERCISE: "Série d'exercices",
  REVISION: 'Révision', EXAM: 'Contrôle/Examen', BAC_SUBJECT: 'Sujet Bac',
  CORRECTION: 'Corrigé', SUMMARY: 'Résumé', OTHER: 'Autre'
};

type Subject = { slug: string; name: string; icon?: string; color?: string };
type ClassItem = { slug: string; name: string; levelSlug: string };
type Section = { slug: string; name: string; classSlug: string };

export default function AddResourcePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [form, setForm] = useState({
    title: '', description: '', type: 'COURSE', subject: '', class: '',
    section: '', trimester: '', year: '2023-2024', tags: ''
  });
  const fileRef = useRef<HTMLInputElement>(null);

  // Load dropdown options
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/teacher/options');
        if (!res.ok) throw new Error('Failed to load options');
        const data = await res.json();
        setSubjects(data.subjects || []);
        setClasses(data.classes || []);
        setSections(data.sections || []);
      } catch (e) {
        toast.error('Erreur de chargement des options');
      } finally {
        setLoadingOptions(false);
      }
    })();
  }, []);

  function update(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') { toast.error('Seuls les fichiers PDF sont acceptés'); return; }
    if (f.size > 50 * 1024 * 1024) { toast.error('Le fichier doit faire moins de 50 Mo'); return; }
    setFile(f);
  }

  // Filter sections by selected class
  const filteredSections = sections.filter(s => !form.class || s.classSlug === form.class);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.subject || !form.class) { toast.error('Titre, matière et classe sont requis'); return; }
    setUploading(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      if (file) data.append('file', file);

      const res = await fetch('/api/teacher/resources', {
        method: 'POST',
        body: data
      });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error || 'Erreur'); return; }
      toast.success('Ressource ajoutée et en attente d\'approbation ! ✅');
      router.push('/enseignant/ressources');
    } catch (e) {
      toast.error('Erreur réseau');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">➕ Ajouter une ressource</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* File upload */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary-600" /> Fichier PDF
          </h2>
          {file ? (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <FileText className="w-8 h-8 text-emerald-500" />
              <div className="flex-1">
                <div className="font-semibold text-sm">{file.name}</div>
                <div className="text-xs text-emerald-600">{(file.size / 1024 / 1024).toFixed(2)} Mo</div>
              </div>
              <button type="button" onClick={() => setFile(null)} className="p-1 hover:bg-emerald-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition">
              <Upload className="w-10 h-10 text-slate-400" />
              <div className="text-sm text-slate-600 text-center">
                Glissez-déposez un PDF ou <span className="text-primary-600 font-semibold">cliquez pour choisir</span>
              </div>
              <div className="text-xs text-slate-400">PDF uniquement · Max 50 Mo</div>
              <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} className="hidden" />
            </label>
          )}
        </div>

        {/* Metadata */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          <h2 className="font-bold mb-2">📋 Informations</h2>

          {loadingOptions ? (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Chargement des matières et classes...</span>
            </div>
          ) : (
            <>
              <div>
                <label className="label">Titre *</label>
                <input type="text" value={form.title} onChange={e => update('title', e.target.value)} required className="input" placeholder="Ex: Devoir de synthèse n°2 — Mathématiques" />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea value={form.description} onChange={e => update('description', e.target.value)} className="input min-h-[100px] resize-none" placeholder="Décrivez votre ressource..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Type *
                  </label>
                  <select value={form.type} onChange={e => update('type', e.target.value)} className="input">
                    {RESOURCE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Matière *
                  </label>
                  <select value={form.subject} onChange={e => update('subject', e.target.value)} required className="input">
                    <option value="">— Choisir une matière —</option>
                    {subjects.map(s => (
                      <option key={s.slug} value={s.slug}>{s.icon ? `${s.icon} ` : ''}{s.name}</option>
                    ))}
                  </select>
                  {subjects.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ Aucune matière disponible</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" /> Classe *
                  </label>
                  <select value={form.class} onChange={e => update('class', e.target.value)} required className="input">
                    <option value="">— Choisir une classe —</option>
                    {classes.map(c => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                  {classes.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ Aucune classe disponible</p>
                  )}
                </div>
                <div>
                  <label className="label">Section (optionnel)</label>
                  <select value={form.section} onChange={e => update('section', e.target.value)} className="input" disabled={!form.class}>
                    <option value="">{form.class ? '— Aucune —' : '— Choisir une classe d\'abord —'}</option>
                    {filteredSections.map(s => (
                      <option key={s.slug} value={s.slug}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Trimestre</label>
                  <select value={form.trimester} onChange={e => update('trimester', e.target.value)} className="input">
                    <option value="">—</option>
                    <option value="1">Trimestre 1</option>
                    <option value="2">Trimestre 2</option>
                    <option value="3">Trimestre 3</option>
                  </select>
                </div>
                <div>
                  <label className="label">Année scolaire</label>
                  <input type="text" value={form.year} onChange={e => update('year', e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">Tags</label>
                  <input type="text" value={form.tags} onChange={e => update('tags', e.target.value)} className="input" placeholder="bac, maths, algo" />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-xl border border-primary-200">
          <Info className="w-5 h-5 text-primary-600 flex-shrink-0" />
          <p className="text-sm text-primary-700">
            Votre ressource sera examinée par l'administrateur avant publication. Vous recevrez une notification dès qu'elle sera validée.
          </p>
        </div>

        <button
          type="submit"
          disabled={uploading || loadingOptions}
          className="btn-accent w-full justify-center py-3"
        >
          {uploading ? 'Envoi...' : '✓ Soumettre pour approbation'}
        </button>
      </form>
    </div>
  );
}