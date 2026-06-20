import Link from 'next/link';
import { Star, Eye, Download, MessageCircle } from 'lucide-react';
import { formatNumber, RESOURCE_TYPE_LABELS } from '@/lib/utils';
import PDFThumbnail from './PDFThumbnail';

export interface ResourceCardData {
  id: string;
  slug: string;
  title: string;
  type: string;
  viewsCount: number;
  downloadsCount: number;
  avgRating: number;
  ratingCount: number;
  commentsCount: number;
  fileUrl?: string | null;
  subject: { slug: string; nameFr: string; color: string | null; icon?: string | null };
  class: { slug: string; nameFr: string } | null;
  teacher: { firstName: string | null; lastName: string | null } | null;
}

export default function ResourceCard({ resource }: { resource: ResourceCardData }) {
  const typeLabel = RESOURCE_TYPE_LABELS[resource.type] || RESOURCE_TYPE_LABELS.OTHER;
  const teacherName = resource.teacher
    ? `${resource.teacher.firstName || ''} ${resource.teacher.lastName || ''}`.trim()
    : 'Anonyme';

  return (
    <Link href={`/ressources/${resource.slug}`} className="card card-hover overflow-hidden group block">
      {/* THUMBNAIL - real PDF page 1 or fallback */}
      <div className="aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden">
        {resource.fileUrl ? (
          <PDFThumbnail
            url={resource.fileUrl}
            title={resource.title}
            className="w-full h-full"
            width={320}
            height={427}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="absolute inset-0 opacity-10" style={{ background: resource.subject.color || '#0EA5E9' }} />
            <span className="text-6xl relative z-10">{resource.subject.icon || '📄'}</span>
          </div>
        )}
        <div className="absolute top-2 left-2 px-2 py-1 bg-slate-900/80 backdrop-blur text-white text-[10px] font-bold rounded z-20">
          {typeLabel.fr}
        </div>
        <div className="absolute top-2 right-2 flex gap-1 z-20">
          {resource.class && (
            <span className="px-2 py-1 bg-white/90 backdrop-blur text-[10px] font-bold text-slate-700 rounded">
              {resource.class.nameFr.split(' ')[0]}
            </span>
          )}
        </div>
        {resource.subject.icon && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/90 backdrop-blur text-[10px] font-bold rounded text-slate-700 z-20">
            {resource.subject.icon} {resource.subject.nameFr}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-sm text-slate-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition min-h-[2.5rem]">
          {resource.title}
        </h3>
        <p className="text-xs text-slate-500 mb-3 truncate">Par {teacherName}</p>

        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${i <= Math.round(resource.avgRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
            />
          ))}
          <span className="text-xs text-slate-500 ml-1">{resource.avgRating.toFixed(1)} ({resource.ratingCount})</span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {formatNumber(resource.viewsCount)}</span>
          <span className="flex items-center gap-1"><Download className="w-3.5 h-3.5" /> {formatNumber(resource.downloadsCount)}</span>
          <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {resource.commentsCount}</span>
        </div>
      </div>
    </Link>
  );
}
