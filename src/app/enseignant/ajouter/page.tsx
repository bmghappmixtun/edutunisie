'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Info, Loader2, BookOpen, GraduationCap, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import ModernUploader from '@/components/teacher/ModernUploader';

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
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [form, setForm] = useState({
    title: '', description: '', type: 'COURSE', subject: '', class: '',
    section: '', trimester: '', year: '2023-2024', tags: ''
  });
  const [uploadedFile, setUploadedFile] = useState<{ fileKey: string; fileUrl: string; fileSize: number; fileName: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetKey, setResetKey] = useState(0);

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

  // Filter sections by selected class
  const filteredSections = sections.filter(s => !form.class || s.classSlug === form.class);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.subject || !form.class) {
      toast.error('Titre, matière et classe sont requis');
      return;
    }
    if (!uploadedFile) {
      toast.error('Veuillez d\'abord uploader un fichier PDF');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/teacher/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          fileKey: uploadedFile.fileKey,
          fileUrl: uploadedFile.fileUrl,
          fileSize: uploadedFile.fileSize,
        })
      });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error || 'Erreur'); return; }
      toast.success('Ressource ajoutée et en attente d\'approbation ! ✅');
      setTimeout(() => router.push('/enseignant/ressources'), 1500);
    } catch (e) {
      toast.error('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold flex items-center gap-2">➕ Ajouter une ressource</h1>
        <p className="text-slate-500 mt-1">
          Uploadez votre fichier, puis complétez les informations. Votre ressource sera publiée après approbation par un administrateur.
        </p>
      </div>

      {/* Step 1: Upload */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-full bg-primary-600 text-white font-bold text-sm flex items-center justify-center">1</span>
          <h2 className="font-bold text-lg">Uploader le fichier PDF</h2>
        </div>
        <ModernUploader
          endpoint="/api/teacher/resources/upload"
          fieldName="file"
          maxSizeMB={50}
          accept="application/pdf"
          formFields={{}}
          resetKey={resetKey}
          onSuccess={(data) => {
            if (data.success && data.fileKey) {
              setUploadedFile({
                fileKey: data.fileKey,
                fileUrl: data.fileUrl,
                fileSize: data.fileSize,
                fileName: data.fileName || 'fichier.pdf'
              });
              toast.success('📄 Fichier uploadé ! Remplissez les infos ci-dessous.');
            }
          }}
          onError={(err) => {
            toast.error('Erreur upload: ' + (typeof err === 'string' ? err : 'inconnue'));
          }}
        />
      </div>

      {/* Step 2: Metadata */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-full bg-primary-600 text-white font-bold text-sm flex items-center justify-center">2</span>
          <h2 className="font-bold text-lg">Informations</h2>
        </div>

        {loadingOptions ? (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-500 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Chargement des matières et classes...</span>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
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
                <label className="label">Section</label>
                <select value={form.section} onChange={e => update('section', e.target.value)} className="input" disabled={!form.class}>
                  <option value="">— Aucune —</option>
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
                  <option value="T1">1er trimestre</option>
                  <option value="T2">2ème trimestre</option>
                  <option value="T3">3ème trimestre</option>
                </select>
              </div>
              <div>
                <label className="label">Année</label>
                <input type="text" value={form.year} onChange={e => update('year', e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Tags</label>
                <input type="text" value={form.tags} onChange={e => update('tags', e.target.value)} className="input" placeholder="math, bac, 2024" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Submit */}
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-full bg-primary-600 text-white font-bold text-sm flex items-center justify-center">3</span>
          <h2 className="font-bold text-lg">Publier</h2>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            {uploadedFile ? (
              <span>✅ Fichier <span className="font-bold text-slate-900">{uploadedFile.fileName}</span> uploadé. Prêt à publier.</span>
            ) : (
              <span>⚠️ Uploadez d'abord un fichier PDF à l'étape 1</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setUploadedFile(null);
                setResetKey(k => k + 1);
              }}
              className="px-4 py-2.5 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Réinitialiser
            </button>
            <button
              type="submit"
              disabled={submitting || !uploadedFile}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Publication...</> : <>Publier la ressource <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
