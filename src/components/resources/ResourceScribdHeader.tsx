'use client';
/**
 * ResourceScribdHeader — Scribd-style header above the resource page.
 *
 * Self-contained client component. Renders:
 *   - Big title (h1) + optional AR title
 *   - AI-improved title/description badge
 *   - Stats line: views + page count + file size
 *   - Description with "Description complète" expand/collapse
 *   - "Transféré par [teacher]" attribution
 *   - Action buttons grid: Télécharger, Enregistrer, Partager, Imprimer, Intégrer
 *   - Secondary actions: Ask AI, Signaler
 *   - Thumbs up/down feedback for AI improvement
 *
 * All event handlers are defined inside this component (NOT props) because
 * Next.js App Router does NOT allow Server Components to pass functions
 * down to Client Components. Instead, we receive `resourceId` and do the
 * API calls locally.
 *
 * Props are all serializable (strings, numbers, booleans, nullable fields).
 */

import { useState, type ReactNode } from 'react';
import {
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Download,
  Star,
  MessageCircle,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

export interface ResourceScribdHeaderProps {
  resourceId: string;
  title: string;
  titleAr?: string | null;
  description?: string | null;
  pageCount?: number | null;
  fileSize?: string | null;
  viewsCount: number;
  downloadsCount: number;
  avgRating: number;
  commentsCount: number;
  downloadUrl: string;
  teacherName?: string | null;
  teacherProfileUrl?: string | null;
  aiImproved?: boolean;
}

const TRUNCATE_AT = 220;

export default function ResourceScribdHeader({
  resourceId,
  title,
  titleAr,
  description,
  pageCount,
  fileSize,
  viewsCount,
  downloadsCount,
  avgRating,
  commentsCount,
  downloadUrl,
  teacherName,
  teacherProfileUrl,
  aiImproved = true,
}: ResourceScribdHeaderProps) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const hasLongDescription = (description?.length ?? 0) > TRUNCATE_AT;
  const visibleDescription = hasLongDescription && !expanded
    ? description!.slice(0, TRUNCATE_AT).trimEnd() + '…'
    : description;

  // ---- Handlers (all internal, no event-handler props) ----

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4">
      <div className="p-5 lg:p-6">
        {/* Title + AI badge */}
        <div className="flex items-start gap-2 mb-3">
          <h1 className="flex-1 text-xl lg:text-2xl font-extrabold text-slate-900 leading-tight">
            {title}
          </h1>
          {aiImproved && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full flex-shrink-0 mt-1"
              title="Titre et description améliorés par l'IA"
            >
              <Sparkles className="w-3 h-3" /> IA
            </span>
          )}

          {/* Feedback thumbs for AI improvement (Scribd has this too) */}
          {aiImproved && (
            <div className="flex items-center gap-0.5 flex-shrink-0 mt-1">
              <button
                onClick={() => setFeedback('up')}
                className={`p-1 rounded transition ${
                  feedback === 'up' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Améliorations utiles"
                aria-label="Feedback positif"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setFeedback('down')}
                className={`p-1 rounded transition ${
                  feedback === 'down' ? 'bg-rose-100 text-rose-700' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Améliorations non utiles"
                aria-label="Feedback négatif"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {titleAr && (
          <div
            className="text-base lg:text-lg font-semibold text-slate-600 mb-3 leading-snug font-arabic-title"
            dir="rtl"
            lang="ar"
          >
            {titleAr}
          </div>
        )}

        {/* Stats line — Scribd style. 2026-08-17: expanded to include
            downloads count, rating, and comments count. Previously these
            lived in a separate stats row below the page title. */}
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> {formatNumber(viewsCount)} vues
          </span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1">
            <Download className="w-3.5 h-3.5" /> {formatNumber(downloadsCount)} téléchargements
          </span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1">
            <Star className="w-3.5 h-3.5" /> {avgRating.toFixed(1)}/5
          </span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" /> {commentsCount} commentaires
          </span>
          {pageCount ? (
            <>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> {pageCount} pages
              </span>
            </>
          ) : null}
          {fileSize ? (
            <>
              <span className="text-slate-300">•</span>
              <span>{fileSize}</span>
            </>
          ) : null}
        </div>

        {/* Description with expand */}
        {description ? (
          <div className="mb-4">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {visibleDescription}
            </p>
            {hasLongDescription && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="text-sm text-primary-600 font-semibold hover:underline mt-1 inline-flex items-center gap-1"
              >
                {expanded ? 'Réduire' : 'Description complète'}
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        ) : null}

        {/* Transféré par attribution */}
        {teacherName && (
          <div className="text-xs text-slate-500 mb-3">
            Transféré par{' '}
            {teacherProfileUrl ? (
              <a
                href={teacherProfileUrl}
                className="font-semibold text-primary-600 hover:underline"
              >
                {teacherName}
              </a>
            ) : (
              <span className="font-semibold text-slate-700">{teacherName}</span>
            )}
          </div>
        )}

        {/* Feedback thumbs for AI improvement — moved to the right side
            of the title row above (see line ~100). 2026-08-17: removed
            Ask AI + Signaler buttons per user feedback. */}
      </div>
    </div>
  );
}

/* build-trigger: 2026-08-17 cache-bust */
