import Link from 'next/link';
import { Download, Eye, Star, FileText, User, Calendar, HardDrive } from 'lucide-react';

type Resource = {
  id: string;
  slug: string;
  title: string;
  type: string;
  fileUrl: string;
  fileSize: number;
  viewsCount: number;
  downloadsCount: number;
  avgRating: number;
  ratingCount: number;
  publishedAt: Date | string | null;
  subject: { slug: string; nameFr: string; color: string | null; icon: string | null } | null;
  class: { slug: string; nameFr: string } | null;
  teacher: { firstName: string | null; lastName: string | null } | null;
};

const TYPE_LABELS: Record<string, string> = {
  COURSE: 'Cours',
  HOMEWORK: 'Devoir',
  EXERCISE: "Série d'exercices",
  REVISION: 'Révision',
  EXAM: 'Contrôle/Examen',
  BAC: 'Sujet Bac',
  CORRIGE: 'Corrigé',
  RESUME: 'Résumé',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ResourceListItem({ resource }: { resource: Resource }) {
  const teacherName = resource.teacher
    ? `${resource.teacher.firstName || ''} ${resource.teacher.lastName || ''}`.trim()
    : null;
  return (
    <Link
      href={`/ressources/${resource.slug}`}
      className="flex items-center gap-4 bg-white border border-slate-100 rounded-xl p-4 hover:border-primary-300 hover:shadow-md transition group"
    >
      {/* Thumbnail / Icon */}
      <div
        className="shrink-0 w-14 h-14 rounded-lg flex items-center justify-center text-2xl"
        style={{ background: (resource.subject?.color || '#0EA5E9') + '15' }}
      >
        <FileText style={{ color: resource.subject?.color || '#0EA5E9' }} className="w-6 h-6" />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{
              background: (resource.subject?.color || '#0EA5E9') + '20',
              color: resource.subject?.color || '#0EA5E9',
            }}
          >
            {TYPE_LABELS[resource.type] || resource.type}
          </span>
          {resource.subject && (
            <span className="text-xs text-slate-500">{resource.subject.nameFr}</span>
          )}
          {resource.class && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500">{resource.class.nameFr}</span>
            </>
          )}
        </div>
        <h3 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-primary-600 transition">
          {resource.title}
        </h3>
        {teacherName && (
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <User className="w-3 h-3" /> {teacherName}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-4 text-xs text-slate-500 shrink-0">
        <div className="flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" /> {resource.viewsCount}
        </div>
        <div className="flex items-center gap-1">
          <Download className="w-3.5 h-3.5" /> {resource.downloadsCount}
        </div>
        {resource.ratingCount > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {resource.avgRating.toFixed(1)}
          </div>
        )}
        <div className="flex items-center gap-1">
          <HardDrive className="w-3.5 h-3.5" /> {formatSize(resource.fileSize)}
        </div>
      </div>
    </Link>
  );
}
