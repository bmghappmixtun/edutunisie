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

import { useState, useMemo, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Download,
  Star,
  MessageCircle,
  ListChecks,
  Target,
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
  // 2026-08-17: AI sections rendered as collapsible accordions in the
  // same card. When provided, the section shows with a count badge;
  // when null/undefined, the section is hidden entirely.
  // aiInsights: string[] (raw insights from exerciseInsights or keyInsights)
  // aiKeyPoints: string[] (long keyPoints)
  // aiShortKeyPoints: string[] (short keyPoints, alternated with long)
  // isArDoc: for RTL alignment
  // subjectSlug: for AR/FR title detection
  aiInsights?: string[] | null;
  aiKeyPoints?: string[] | null;
  aiShortKeyPoints?: string[] | null;
  isArDoc?: boolean;
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
  aiInsights = null,
  aiKeyPoints = null,
  aiShortKeyPoints = null,
  isArDoc = false,
}: ResourceScribdHeaderProps) {
  const [expanded, setExpanded] = useState(false);
  // 2026-08-17: feedback state removed (thumbs deleted)


  const hasLongDescription = (description?.length ?? 0) > TRUNCATE_AT;
  const visibleDescription = hasLongDescription && !expanded
    ? description!.slice(0, TRUNCATE_AT).trimEnd() + '…'
    : description;

  // Merge short + long key points (alternate, max 10)
  const mergedKP = useMemo(() => {
    const longKps = aiKeyPoints || [];
    const shortKps = aiShortKeyPoints || [];
    const merged: { text: string; isShort: boolean }[] = [];
    const maxLen = Math.max(longKps.length, shortKps.length);
    for (let i = 0; i < maxLen && merged.length < 10; i++) {
      if (i < shortKps.length) merged.push({ text: shortKps[i], isShort: true });
      if (i < longKps.length && merged.length < 10) merged.push({ text: longKps[i], isShort: false });
    }
    return merged;
  }, [aiKeyPoints, aiShortKeyPoints]);

  // ---- Handlers (all internal, no event-handler props) ----

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4">
      <div className="p-5 lg:p-6">
        {/* Title + AI badge */}
        <div className="flex items-start gap-2 mb-3">
          <h1 className="flex-1 text-xl lg:text-2xl font-extrabold text-slate-900 leading-tight">
            {title}
          </h1>
          {/* 2026-08-17: removed the IA badge and the feedback thumbs
              (Scribd has these too but the user found them cluttering
              the title row). */}
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

        {/* Transféré par attribution — right-aligned per user request 2026-08-17 */}
        {teacherName && (
          <div className="text-xs text-slate-500 mb-3 text-right">
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

        {/* 2026-08-17: AI sections (Aperçu des exercices + Points clés)
            as collapsible accordions, integrated into the same card as
            the title. Collapsed by default to save vertical space.
            Both sections are optional — only render if data is provided. */}
        {(aiInsights?.length || aiKeyPoints?.length || aiShortKeyPoints?.length) ? (
          {/* 2026-08-17: removed the border-t and the mt-3/pt-3 to
              tighten the gap between Transféré par and the AI sections. */}
          <div className="pt-2 space-y-2">
            {aiInsights && aiInsights.length > 0 && (
              <details className="group">
                <summary className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-primary-600 cursor-pointer list-none py-1.5">
                  <ListChecks className="w-4 h-4 text-primary-500" />
                  <span>{isArDoc ? 'نظرة عامة على التمارين' : 'Aperçu des exercices'}</span>
                  {/* IA badge removed 2026-08-17 */}
                  <span className="text-xs text-slate-400 ml-auto font-normal">
                    {aiInsights.length} {aiInsights.length > 1 ? 'items' : 'item'}
                  </span>
                  <ChevronDown className="chevron w-4 h-4 text-slate-400" />
                </summary>
                <div className={`pl-6 py-2 text-sm text-slate-600 space-y-2 ${isArDoc ? 'text-right' : ''}`}>
                  {aiInsights.map((item, i) => (
                    <div key={i} className="leading-relaxed">
                      {item}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {mergedKP.length > 0 && (
              <details className="group">
                <summary className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-primary-600 cursor-pointer list-none py-1.5">
                  <Target className="w-4 h-4 text-primary-500" />
                  <span>{isArDoc ? 'النقاط الرئيسية' : 'Points clés'}</span>
                  {/* IA badge removed 2026-08-17 */}
                  <span className="text-xs text-slate-400 ml-auto font-normal">
                    {mergedKP.length} {mergedKP.length > 1 ? 'notions' : 'notion'}
                  </span>
                  <ChevronDown className="chevron w-4 h-4 text-slate-400" />
                </summary>
                <div className={`pl-6 py-2 flex flex-wrap gap-2 ${isArDoc ? 'justify-end' : 'justify-start'}`}>
                  {mergedKP.map((kp, i) => {
                    const palette = kp.isShort
                      ? ['bg-rose-50 text-rose-700 border-rose-200', 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', 'bg-teal-50 text-teal-700 border-teal-200', 'bg-amber-50 text-amber-700 border-amber-200', 'bg-violet-50 text-violet-700 border-violet-200']
                      : ['bg-rose-100 text-rose-800 border-rose-300', 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300', 'bg-teal-100 text-teal-800 border-teal-300', 'bg-amber-100 text-amber-800 border-amber-300', 'bg-violet-100 text-violet-800 border-violet-300'];
                    const colorClass = palette[i % palette.length];
                    return (
                      <span
                        key={i}
                        dir={isArDoc ? 'rtl' : 'ltr'}
                        className={`px-3 py-1 ${colorClass} border rounded-full text-xs font-semibold ${isArDoc ? 'text-right' : 'text-left'}`}
                      >
                        {kp.text}
                      </span>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
