'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Info, Loader2, BookOpen, GraduationCap, ChevronRight, Library, CheckCircle2, Wrench, School } from 'lucide-react';
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

type UploadedFile = {
  libraryFileId: string;
  fileKey: string;          // PDF key (for the resource)
  fileUrl: string;          // PDF URL
  fileSize: number;
  fileName: string;
  originalFormat: string;
  conversionStatus: string;
};

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
  // Homework & school metadata
  const [homeworkSubtype, setHomeworkSubtype] = useState<string>(''); // CONTROL | SYNTHESIS | HOUSEWORK
  const [homeworkNumber, setHomeworkNumber] = useState<number | ''>('');
  const [schoolType, setSchoolType] = useState<string>('PUBLIC');
  const [product, setProduct] = useState<string>('');
  const [hasCorrection, setHasCorrection] = useState<boolean>(false);
  const [correctionSummary, setCorrectionSummary] = useState<string>('');

  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Show product field only for technologie + 7-8-9ème (collège)
  const showProductField = useMemo(() => {
    return form.subject === 'technologie' && ['7eme', '8eme', '9eme'].includes(form.class);
  }, [form.subject, form.class]);

  // Auto-inference: when title changes, detect homework subtype + number + trimester
  useEffect(() => {
    const title = form.title;
    if (!title) return;
    let detectedSubtype = '';
    let detectedNumber: number | '' = '';
    let detectedTrimester = '';
    const lower = title.toLowerCase();

    // Subtype detection
    if (/contr[oô]le|controle/i.test(title)) detectedSubtype = 'CONTROL';
    else if (/synth[eè]se|synthese|synt[eè]se/i.test(title)) detectedSubtype = 'SYNTHESIS';
    else if (/\bmaison\b/i.test(title)) detectedSubtype = 'HOUSEWORK';

    // Number detection: "N°1", "N 1", "n°2", "numéro 3", etc.
    const numMatch = title.match(/N[°o\u00ba]\s*(\d+)|num[eé]ro\s*(\d+)|n[\.\s]+(\d+)/i);
    if (numMatch) {
      const n = parseInt(numMatch[1] || numMatch[2] || numMatch[3], 10);
      if (Number.isFinite(n) && n >= 1 && n <= 20) detectedNumber = n;
    }
    // Trimester auto-fill from number (only when not set by user)
    if (detectedNumber && !form.trimester) {
      if (detectedNumber === 1) detectedTrimester = 'T1';
      else if (detectedNumber === 2) detectedTrimester = 'T2';
      else if (detectedNumber >= 3) detectedTrimester = 'T3';
    }

    if (detectedSubtype && !homeworkSubtype) setHomeworkSubtype(detectedSubtype);
    if (detectedNumber && !homeworkNumber) setHomeworkNumber(detectedNumber);
    if (detectedTrimester) {
      setForm(p => p.trimester ? p : { ...p, trimester: detectedTrimester });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title]);

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
      toast.error("Veuillez d'abord uploader un fichier");
      return;
    }
    if (uploadedFile.conversionStatus === 'FAILED') {
      toast.error('Conversion PDF échouée pour ce fichier. Ré-uploadez en PDF.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/teacher/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          // We pass libraryFileId so the server uses the stored PDF
          // AND links the library file to the resource
          libraryFileId: uploadedFile.libraryFileId,
          fileKey: uploadedFile.fileKey,
          fileUrl: uploadedFile.fileUrl,
          fileSize: uploadedFile.fileSize,
          // Homework & school metadata (NEW)
          homeworkSubtype: form.type === 'HOMEWORK' && homeworkSubtype ? homeworkSubtype : null,
          homeworkNumber: form.type === 'HOMEWORK' && homeworkNumber ? Number(homeworkNumber) : null,
          schoolType: schoolType || 'PUBLIC',
          product: showProductField && product ? product : null,
          hasCorrection,
          correctionSummary: hasCorrection && correctionSummary ? correctionSummary : null,
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
          Uploadez votre fichier (PDF ou Word). Le fichier original est automatiquement
          sauvegardé dans <a href="/enseignant/bibliotheque" className="text-primary-600 font-semibold underline">votre bibliothèque</a> pour réutilisation future.
        </p>
      </div>

      {/* Step 1: Upload */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-7 h-7 rounded-full bg-primary-600 text-white font-bold text-sm flex items-center justify-center">1</span>
          <h2 className="font-bold text-lg">Uploader le fichier</h2>
        </div>
        <ModernUploader
          endpoint="/api/teacher/files/upload"
          fieldName="file"
          maxSizeMB={50}
          accept=".pdf,.docx,.doc,.odt"
          formFields={{}}
          resetKey={resetKey}
          onSuccess={(data) => {
            if (data.success && data.libraryFileId) {
              setUploadedFile({
                libraryFileId: data.libraryFileId,
                fileKey: data.pdfKey || data.fileKey,
                fileUrl: data.pdfUrl || data.fileUrl,
                fileSize: data.file?.fileSize || 0,
                fileName: data.file?.fileName || 'fichier',
                originalFormat: data.originalFormat,
                conversionStatus: data.conversionStatus,
              });

              if (data.conversionStatus === 'FAILED') {
                toast.error('⚠️ Conversion PDF échouée. Vous pouvez ré-uploader le fichier en PDF manuellement.');
              } else if (data.originalFormat !== 'pdf' && data.conversionStatus === 'SUCCESS') {
                toast.success('📄 Fichier Word converti en PDF ! Sauvegardé dans votre bibliothèque.');
              } else {
                toast.success('📄 Fichier uploadé ! Sauvegardé dans votre bibliothèque.');
              }
            }
          }}
          onError={(err) => {
            toast.error('Erreur upload: ' + (typeof err === 'string' ? err : 'inconnue'));
          }}
        />

        {/* Show library hint when file is uploaded */}
        {uploadedFile && uploadedFile.conversionStatus !== 'FAILED' && (
          <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-start gap-2">
            <Library className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Original sauvegardé.</strong> Vous retrouverez{' '}
              <span className="font-mono text-xs">{uploadedFile.fileName}</span> dans votre{' '}
              <a href="/enseignant/bibliotheque" className="font-bold underline">bibliothèque</a>
              {' '}pour le télécharger ou le réutiliser plus tard.
            </div>
          </div>
        )}
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
                <select
                  key={`sections-${form.class}`}
                  value={form.section}
                  onChange={e => update('section', e.target.value)}
                  className="input"
                  disabled={!form.class}
                >
                  <option value="">— Aucune —</option>
                  {filteredSections.map(s => (
                    <option key={`${s.classSlug}-${s.slug}`} value={s.slug} data-class-slug={s.classSlug}>{s.name}</option>
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

            {/* ===== HOMEWORK & SCHOOL METADATA (NEW) ===== */}

            {/* Homework subtype + number — only when type=HOMEWORK */}
            {form.type === 'HOMEWORK' && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  <span className="font-bold text-amber-900 dark:text-amber-200">Détails du devoir</span>
                  <span className="text-xs text-amber-700 ml-auto">
                    Auto-détecté depuis le titre — modifiable
                  </span>
                </div>
                <div>
                  <label className="label">Type de devoir</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'CONTROL', label: '📋 Devoir de Contrôle', color: 'red' },
                      { value: 'SYNTHESIS', label: '📝 Devoir de Synthèse', color: 'violet' },
                      { value: 'HOUSEWORK', label: '🏠 Devoir de Maison', color: 'orange' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setHomeworkSubtype(opt.value)}
                        className={`px-3 py-2 rounded-lg text-sm font-bold border transition ${
                          homeworkSubtype === opt.value
                            ? opt.color === 'red' ? 'bg-red-100 border-red-400 text-red-800'
                            : opt.color === 'violet' ? 'bg-violet-100 border-violet-400 text-violet-800'
                            : 'bg-orange-100 border-orange-400 text-orange-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Numéro du devoir (optionnel)</label>
                    <select
                      value={homeworkNumber}
                      onChange={e => setHomeworkNumber(e.target.value ? parseInt(e.target.value, 10) : '')}
                      className="input"
                    >
                      <option value="">— Non spécifié —</option>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <option key={n} value={n}>N°{n}</option>
                      ))}
                    </select>
                    <p className="text-xs text-amber-700 mt-1">
                      💡 Le numéro indique le trimestre (N°1 = T1, N°2 = T2, N°3+ = T3)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* School type */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-slate-700" />
                <span className="font-bold text-slate-900 dark:text-slate-200">Type d'école</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSchoolType('PUBLIC')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold border transition ${
                    schoolType === 'PUBLIC' || !schoolType
                      ? 'bg-slate-200 border-slate-400 text-slate-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  🏫 École publique
                </button>
                <button
                  type="button"
                  onClick={() => setSchoolType('PILOTE')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold border transition ${
                    schoolType === 'PILOTE'
                      ? 'bg-amber-200 border-amber-500 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  🎓 Lycée/Collège Pilote
                </button>
              </div>
              {schoolType === 'PILOTE' && (
                <p className="text-xs text-amber-700">
                  ⓘ Le badge “🏫 Pilote” sera affiché sur la fiche de la ressource.
                </p>
              )}
            </div>

            {/* Product (المنتج) — only for technologie + 7-8-9ème */}
            {showProductField && (
              <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-orange-700" />
                  <span className="font-bold text-orange-900 dark:text-orange-200">المنتج / Produit réalisé</span>
                  <span className="text-xs text-orange-700">(Technologie collège — optionnel)</span>
                </div>
                <input
                  type="text"
                  value={product}
                  onChange={e => setProduct(e.target.value)}
                  className="input text-right"
                  dir="rtl"
                  placeholder="مثال: مطوية، برنامج سكراتش، موقع إلكتروني..."
                  maxLength={200}
                />
                <p className="text-xs text-orange-700">
                  💡 Décrit le produit/livrable du projet de technologie (en arabe).
                </p>
              </div>
            )}

            {/* Correction (optionnel) */}
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasCorrection}
                  onChange={e => setHasCorrection(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    <span className="font-bold text-emerald-900 dark:text-emerald-200">
                      Ce document contient un corrigé
                    </span>
                    <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      Très recherché par les élèves 🔥
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-1">
                    Cochez si votre PDF inclut le corrigé détaillé à la fin du document. Un badge vert proéminent
                    sera affiché pour aider les élèves à le trouver.
                  </p>
                </div>
              </label>
              {hasCorrection && (
                <div>
                  <label className="label">Description du corrigé (optionnel)</label>
                  <textarea
                    value={correctionSummary}
                    onChange={e => setCorrectionSummary(e.target.value)}
                    className="input min-h-[60px] resize-none text-sm"
                    placeholder="Ex: Corrigé détaillé des exercices 1 à 4 avec barème et explications..."
                    maxLength={500}
                  />
                </div>
              )}
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
              uploadedFile.conversionStatus === 'FAILED' ? (
                <span className="text-amber-700">⚠️ Conversion échouée. Ré-uploadez en PDF.</span>
              ) : (
                <span>
                  ✅ Fichier <span className="font-bold text-slate-900">{uploadedFile.fileName}</span> prêt à publier.
                  {uploadedFile.originalFormat !== 'pdf' && (
                    <span className="ml-1 text-blue-600">
                      (original {uploadedFile.originalFormat.toUpperCase()} sauvegardé)
                    </span>
                  )}
                </span>
              )
            ) : (
              <span>⚠️ Uploadez d'abord un fichier à l'étape 1</span>
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
              disabled={submitting || !uploadedFile || uploadedFile.conversionStatus === 'FAILED'}
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