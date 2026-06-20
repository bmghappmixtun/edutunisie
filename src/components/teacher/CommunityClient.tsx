'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

type Teacher = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  schoolName: string | null;
  governorate: string | null;
  isVerifiedTeacher: boolean;
};

type CommunityFile = {
  id: string;
  fileName: string;
  originalFormat: string;
  fileKey: string;
  fileSize: number;
  pdfKey?: string | null;
  pdfUrl?: string | null;
  pdfSize?: number | null;
  type?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  subjectId?: string | null;
  trimester?: string | null;
  year?: string | null;
  tags?: string | null;
  notes?: string | null;
  createdAt: string;
  class?: { id: string; nameFr: string; nameAr: string } | null;
  section?: { id: string; nameFr: string; nameAr: string } | null;
  subject?: { id: string; nameFr: string; nameAr: string; color?: string | null; icon?: string | null } | null;
  teacher: Teacher;
  linkedResource?: {
    id: string;
    slug: string;
    title: string;
    viewsCount: number;
    downloadsCount: number;
    favoritesCount: number;
    avgRating: number;
    ratingCount: number;
  } | null;
};

const FILE_TYPES = [
  { value: 'COURSE', label: 'Cours', icon: '📖', color: 'sky' },
  { value: 'HOMEWORK', label: 'Devoir', icon: '📝', color: 'amber' },
  { value: 'EXERCISE', label: 'Exercice', icon: '✏️', color: 'emerald' },
  { value: 'SERIES', label: 'Série', icon: '📋', color: 'violet' },
  { value: 'EXAM', label: 'Examen', icon: '📊', color: 'red' },
  { value: 'SUMMARY', label: 'Résumé', icon: '📄', color: 'blue' },
  { value: 'LESSON_PLAN', label: 'Fiche péda.', icon: '🎯', color: 'orange' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getInitials(t: Teacher): string {
  const a = (t.firstName?.[0] || '').toUpperCase();
  const b = (t.lastName?.[0] || '').toUpperCase();
  return a + b || '👤';
}

function getFormatBadge(format: string) {
  switch (format) {
    case 'pdf': return { label: 'PDF', className: 'bg-red-100 text-red-700' };
    case 'docx': return { label: 'DOCX', className: 'bg-blue-100 text-blue-700' };
    case 'doc': return { label: 'DOC', className: 'bg-slate-100 text-slate-700' };
    case 'odt': return { label: 'ODT', className: 'bg-emerald-100 text-emerald-700' };
    default: return { label: format.toUpperCase(), className: 'bg-slate-100 text-slate-700' };
  }
}

export default function CommunityClient({
  classes,
  subjects,
}: {
  classes: { id: string; nameFr: string; nameAr: string; slug: string }[];
  subjects: { id: string; nameFr: string; nameAr: string; slug: string; color?: string | null; icon?: string | null }[];
}) {
  const [files, setFiles] = useState<CommunityFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    search: '',
    classId: '',
    subjectId: '',
    type: '',
    format: '',
  });

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.search) params.set('search', filter.search);
      if (filter.classId) params.set('classId', filter.classId);
      if (filter.subjectId) params.set('subjectId', filter.subjectId);
      if (filter.type) params.set('type', filter.type);
      if (filter.format) params.set('format', filter.format);

      const res = await fetch(`/api/teacher/community/files?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setFiles(data.files || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const typeInfo = (type: string | null | undefined) => {
    const found = FILE_TYPES.find((t) => t.value === type);
    if (found) return found;
    return { value: type || 'OTHER', label: type || 'Autre', icon: '📄', color: 'slate' };
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher dans la communauté…"
                value={filter.search}
                onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>
          </div>
          <select
            value={filter.subjectId}
            onChange={(e) => setFilter((f) => ({ ...f, subjectId: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          >
            <option value="">Toutes les matières</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.icon ? `${s.icon} ` : ''}{s.nameFr}</option>
            ))}
          </select>
          <select
            value={filter.classId}
            onChange={(e) => setFilter((f) => ({ ...f, classId: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          >
            <option value="">Toutes les classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.nameFr}</option>
            ))}
          </select>
          <select
            value={filter.type}
            onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          >
            <option value="">Tous les types</option>
            {FILE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
        </div>
        <div className="text-sm text-slate-500 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          {loading ? '⏳ Chargement…' : `${files.length} fichier${files.length > 1 ? 's' : ''} partagé${files.length > 1 ? 's' : ''} par la communauté`}
        </div>
      </div>

      {/* Files grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
          <div className="text-6xl mb-4">🤝</div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            Aucun fichier partagé pour l'instant
          </h3>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Soyez le premier à partager ! Uploadez vos fichiers Office dans votre bibliothèque
            et ils apparaîtront ici pour les autres enseignants.
          </p>
          <Link
            href="/enseignant/ajouter"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-gradient-to-r from-primary to-cyan-500 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition"
          >
            📤 Uploader une ressource
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => {
            const ti = typeInfo(file.type);
            const fb = getFormatBadge(file.originalFormat);
            const t = file.teacher;
            return (
              <div
                key={file.id}
                className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:border-primary/40 transition"
              >
                {/* Top gradient */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-primary" />

                <div className="p-4">
                  {/* Header: teacher + type */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                      {getInitials(t)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {t.firstName} {t.lastName}
                        {t.isVerifiedTeacher && (
                          <span className="ml-1 text-blue-500" title="Enseignant vérifié">✓</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {t.schoolName || t.governorate || 'Enseignant'}
                      </div>
                    </div>
                    <span className={`text-2xl flex-shrink-0`}>{ti.icon}</span>
                  </div>

                  {/* File info */}
                  <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2 mb-2" title={file.fileName}>
                    {file.fileName}
                  </h3>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${fb.className}`}>
                      {fb.label}
                    </span>
                    {file.subject && (
                      <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {file.subject.icon ? `${file.subject.icon} ` : ''}{file.subject.nameFr}
                      </span>
                    )}
                    {file.class && (
                      <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        🎓 {file.class.nameFr}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  {file.linkedResource && (
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                      <span>👁️ {file.linkedResource.viewsCount}</span>
                      <span>⬇️ {file.linkedResource.downloadsCount}</span>
                      <span>❤️ {file.linkedResource.favoritesCount}</span>
                      {file.linkedResource.ratingCount > 0 && (
                        <span>⭐ {file.linkedResource.avgRating.toFixed(1)}</span>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-slate-400 mb-3">
                    💾 {formatBytes(file.fileSize)} • 📅 {formatDate(file.createdAt)}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5">
                    {file.pdfUrl && (
                      <a
                        href={file.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-500 hover:text-white rounded-lg text-sm font-medium text-red-700 dark:text-red-300 transition"
                      >
                        <span>📄</span> PDF
                      </a>
                    )}
                    <a
                      href={`/api/resources/${file.linkedResource?.id || ''}/download?original=1`}
                      onClick={(e) => {
                        if (!file.linkedResource?.id) {
                          e.preventDefault();
                          toast('Cette ressource n\'a pas encore été publiée.');
                        }
                      }}
                      download={file.fileName}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-500 hover:text-white rounded-lg text-sm font-bold text-blue-700 dark:text-blue-300 transition"
                      title={`Télécharger l'original ${file.originalFormat.toUpperCase()}`}
                    >
                      <span>⬇️</span> Original ({file.originalFormat.toUpperCase()})
                    </a>
                    {file.linkedResource && (
                      <Link
                        href={`/ressources/${file.linkedResource.slug}`}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 transition"
                        title="Voir la ressource"
                      >
                        👁️
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}