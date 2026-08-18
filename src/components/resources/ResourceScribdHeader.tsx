'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
  Clock,
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
  aiInsights = null,
  aiKeyPoints = null,
  aiShortKeyPoints = null,
  isArDoc = false,
}: ResourceScribdHeaderProps) {
  const [expanded, setExpanded] = useState(false);
  // 2026-08-17 (Niveau 1.2): auto-collapse AI accordions when the user
  // scrolls into the PDF viewer. They stay closed until the user clicks
  // them again. Tracked via a sentinel element placed just above the
  // PDF viewer.
  const [aiOpen, setAiOpen] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = document.getElementById('pdf-viewer-sentinel');
    if (!sentinel) return;
    // 2026-08-18 fix: 0-height sentinel was unreliable for
    // IntersectionObserver. Use scroll-based detection instead:
    // when the PDF viewer top crosses the bottom of the header,
    // close the AI accordions.
    let lastClosed = false;
    const check = () => {
      const rect = sentinel.getBoundingClientRect();
      // Close when sentinel has scrolled above the sticky bar (top: 64px)
      // and the PDF is now occupying the viewport
      const shouldClose = rect.top < 64;
      if (shouldClose && !lastClosed) {
        lastClosed = true;
        setAiOpen(false);
      } else if (!shouldClose) {
        lastClosed = false;
      }
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  // 2026-08-17 (Niveau 1.3): reading time estimate. ~1.5 minutes per page
  // for academic content, rounded up to the nearest minute.
  const readingTimeMin = useMemo(() => {
    if (!pageCount) return null;
    return Math.max(1, Math.ceil(pageCount * 1.5));
  }, [pageCount]);

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

  const hasInsights = !!(aiInsights && aiInsights.length > 0);
  const hasKeyPoints = mergedKP.length > 0;
  const hasAnyAI = hasInsights || hasKeyPoints;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4">
      <div className="p-5 lg:p-6">
        {/* Title */}
        <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 leading-tight mb-3">
          {title}
        </h1>

        {titleAr && (
          <div
            className="text-base lg:text-lg font-semibold text-slate-600 mb-3 leading-snug font-arabic-title"
            dir="rtl"
            lang="ar"
          >
            {titleAr}
          </div>
        )}

        {/* Stats line */}
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
          {readingTimeMin ? (
            <>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> ≈ {readingTimeMin} min de lecture
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

        {/* Transféré par — right-aligned per user request 2026-08-17 */}
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

        {/* AI sections as collapsible accordions */}
        {hasAnyAI && (
          <div ref={detailsRef} className="pt-2 space-y-2">
            {hasInsights && (
              <details
                className="group"
                open={aiOpen}
                onToggle={(e) => setAiOpen((e.target as HTMLDetailsElement).open)}
              >
                <summary className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-primary-600 cursor-pointer list-none py-1.5">
                  <ListChecks className="w-4 h-4 text-primary-500" />
                  <span>{isArDoc ? 'نظرة عامة على التمارين' : 'Aperçu des exercices'}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform ml-auto" />
                </summary>
                <div className={`pl-6 py-2 text-sm text-slate-600 space-y-2 ${isArDoc ? 'text-right' : ''}`}>
                  {aiInsights!.map((item, i) => (
                    <div key={i} className="leading-relaxed">{item}</div>
                  ))}
                </div>
              </details>
            )}

            {hasKeyPoints && (
              <details
                className="group"
                open={aiOpen}
                onToggle={(e) => setAiOpen((e.target as HTMLDetailsElement).open)}
              >
                <summary className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-primary-600 cursor-pointer list-none py-1.5">
                  <Target className="w-4 h-4 text-primary-500" />
                  <span>{isArDoc ? 'النقاط الرئيسية' : 'Points clés'}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform ml-auto" />
                </summary>
                {/* 2026-08-17: KP bubbles use a neutral style (no per-bubble
                    color). Just text + border, same look for all bubbles. */}
                <div className={`pl-6 py-2 flex flex-wrap gap-2 ${isArDoc ? 'justify-end' : 'justify-start'}`}>
                  {mergedKP.map((kp, i) => (
                    <span
                      key={i}
                      dir={isArDoc ? 'rtl' : 'ltr'}
                      className={`px-3 py-1 bg-white text-slate-700 border border-slate-200 rounded-full text-xs font-semibold hover:bg-slate-50 ${isArDoc ? 'text-right' : 'text-left'}`}
                    >
                      {kp.text}
                    </span>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
