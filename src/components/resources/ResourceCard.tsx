import Link from 'next/link';
import { Star, Eye, Download, CheckCircle2, GraduationCap, Clock } from 'lucide-react';
import { RESOURCE_TYPE_LABELS, HOMEWORK_SUBTYPE_LABELS } from '@/lib/utils';
import { isArabic } from '@/lib/text-utils';

export interface ResourceCardData {
  id: string;
  slug: string;
  title: string;
  type: string;
  summary?: string | null;
  viewsCount: number;
  downloadsCount: number;
  avgRating: number;
  ratingCount: number;
  commentsCount?: number;
  fileSize?: number;
  pageCount?: number | null;
  language?: string;
  year?: string | null;
  publishedAt?: Date | string | null;
  // Homework & school metadata
  homeworkSubtype?: string | null;
  homeworkNumber?: number | null;
  schoolType?: string | null;
  product?: string | null;
  hasCorrection?: boolean;
  subject: { slug: string; nameFr: string; color: string | null; icon?: string | null };
  class: { slug: string; nameFr: string } | null;
  teacher: { firstName: string | null; lastName: string | null; firstNameAr?: string | null; lastNameAr?: string | null } | null;
}

function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 1) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `${days}j`;
  if (days < 30) return `${Math.floor(days / 7)}sem`;
  if (days < 365) return `${Math.floor(days / 30)}mois`;
  return `${Math.floor(days / 365)}an`;
}

export default function ResourceCard({ resource }: { resource: ResourceCardData }) {
  const typeLabel = RESOURCE_TYPE_LABELS[resource.type] || RESOURCE_TYPE_LABELS.OTHER;
  const teacherName = resource.teacher
    ? `${resource.teacher.firstName || ''} ${resource.teacher.lastName || ''}`.trim()
    : null;
  const teacherNameAr = resource.teacher && (resource.teacher.firstNameAr || resource.teacher.lastNameAr)
    ? `${resource.teacher.firstNameAr || ''} ${resource.teacher.lastNameAr || ''}`.trim()
    : null;
  const subjectColor = resource.subject.color || '#0EA5E9';
  const typeShortFr = typeLabel.fr;
  const titleIsAr = isArabic(resource.title);
  const summaryIsAr = resource.summary ? isArabic(resource.summary) : false;

  return (
    <Link
      href={`/ressources/${resource.slug}`}
      className="group block relative overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
      style={{
        background: `
          radial-gradient(at 20% 20%, ${subjectColor}20 0px, transparent 50%),
          radial-gradient(at 80% 0%, ${subjectColor}15 0px, transparent 50%),
          radial-gradient(at 0% 100%, ${subjectColor}10 0px, transparent 50%),
          white
        `,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)',
      }}
    >
      {/* Subtle gradient overlay on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(at 80% 80%, ${subjectColor}15 0px, transparent 50%)`,
        }}
      />

      <div className="relative p-5">
        {/* Header: type + class + date */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="px-2.5 py-1 bg-slate-900/90 text-white text-[10px] font-bold uppercase tracking-wider rounded-full whitespace-nowrap">
              {typeShortFr}
            </span>
            {resource.class && (
              <span className="px-2.5 py-1 bg-slate-900/90 text-white text-[10px] font-bold uppercase tracking-wider rounded-full whitespace-nowrap">
                {resource.class.nameFr}
              </span>
            )}
            {resource.year && (
              <span className="px-2.5 py-1 bg-white/60 backdrop-blur text-slate-700 text-[10px] font-bold rounded-full whitespace-nowrap">
                {resource.year}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold text-slate-500 shrink-0">
            {timeAgo(resource.publishedAt)}
          </span>
        </div>

        {/* Homework subtype */}
        {resource.type === 'HOMEWORK' && resource.homeworkSubtype && HOMEWORK_SUBTYPE_LABELS[resource.homeworkSubtype] && (
          <div className="mb-2">
            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${HOMEWORK_SUBTYPE_LABELS[resource.homeworkSubtype].color}`}>
              {HOMEWORK_SUBTYPE_LABELS[resource.homeworkSubtype].fr}
              {resource.homeworkNumber ? ` N°${resource.homeworkNumber}` : ''}
            </span>
          </div>
        )}

        {/* Title */}
        <h3
          className={`text-base font-extrabold text-slate-900 leading-snug mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2 ${titleIsAr ? 'text-right' : 'text-left'}`}
          dir={titleIsAr ? 'rtl' : 'ltr'}
          lang={titleIsAr ? 'ar' : 'fr'}
        >
          {resource.title}
        </h3>

        {/* Subject + metadata line */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-3 flex-wrap">
          {resource.subject.icon && <span>{resource.subject.icon}</span>}
          <span className="font-semibold" style={{ color: subjectColor }}>
            {resource.subject.nameFr}
          </span>
          {resource.pageCount != null && resource.pageCount > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span>📄 {resource.pageCount} p</span>
            </>
          )}
          {resource.fileSize && (
            <>
              <span className="text-slate-300">·</span>
              <span>💾 {formatSize(resource.fileSize)}</span>
            </>
          )}
          {resource.language && (
            <>
              <span className="text-slate-300">·</span>
              <span>{resource.language === 'ar' ? '🇸🇦' : resource.language === 'fr+ar' ? '🇫🇷+🇹🇳' : '🇫🇷'}</span>
            </>
          )}
        </div>

        {/* Summary - KEY FEATURE */}
        {resource.summary && (
          <p
            className={`text-sm text-slate-700 leading-relaxed mb-4 line-clamp-2 ${summaryIsAr ? 'text-right' : 'text-left'}`}
            dir={summaryIsAr ? 'rtl' : 'ltr'}
            lang={summaryIsAr ? 'ar' : 'fr'}
          >
            {resource.summary}
          </p>
        )}

        {/* Teacher */}
        {teacherName && (
          <div className="flex items-center gap-2 mb-3 flex-wrap text-xs">
            <span className="text-slate-500">Par</span>
            <span className="font-bold text-slate-700">{teacherName}</span>
            {teacherNameAr && (
              <span className="text-slate-400" dir="rtl" lang="ar">
                · {teacherNameAr}
              </span>
            )}
            {resource.schoolType === 'PILOTE' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                <GraduationCap className="w-2.5 h-2.5" /> Pilote
              </span>
            )}
          </div>
        )}

        {/* Bottom: stats (Vues / DL / Note) + Corrigé badge */}
        <div className="flex items-end justify-between pt-3 border-t border-slate-200/60">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-lg font-extrabold text-slate-900 leading-tight">
                {resource.viewsCount >= 1000 ? `${(resource.viewsCount / 1000).toFixed(1)}k` : resource.viewsCount}
              </div>
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Vues</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-extrabold text-slate-900 leading-tight">
                {resource.downloadsCount >= 1000 ? `${(resource.downloadsCount / 1000).toFixed(1)}k` : resource.downloadsCount}
              </div>
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">DL</div>
            </div>
            {resource.ratingCount > 0 && (
              <div className="text-center">
                <div className="text-lg font-extrabold text-amber-500 leading-tight flex items-center gap-0.5">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {resource.avgRating.toFixed(1)}
                </div>
                <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">{resource.ratingCount} notes</div>
              </div>
            )}
          </div>
          {resource.hasCorrection && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full shadow-sm">
              <CheckCircle2 className="w-3 h-3" /> Corrigé
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
