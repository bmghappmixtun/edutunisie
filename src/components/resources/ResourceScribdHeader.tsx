'use client';

import { useState, useMemo } from 'react';
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
  aiInsights?: string[] | null;
  aiKeyPoints?: string[] | null;
  aiShortKeyPoints?: string[] | null;
  isArDoc?: boolean;
}

const TRUNCATE_AT = 220;

const KP_PALETTE_SHORT = [
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  'bg-teal-50 text-teal-700 border-teal-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-violet-50 text-violet-700 border-violet-200',
];

const KP_PALETTE_LONG = [
  'bg-rose-100 text-rose-800 border-rose-300',
  'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
  'bg-teal-100 text-teal-800 border-teal-300',
  'bg-amber-100 text-amber-800 border-amber-300',
  'bg-violet-100 text-violet-800 border-violet-300',
];

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
          <div className="pt-2 space-y-2">
            {hasInsights && (
              <details className="group">
                <summary className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-primary-600 cursor-pointer list-none py-1.5">
                  <ListChecks className="w-4 h-4 text-primary-500" />
                  <span>{isArDoc ? 'نظرة عامة على التمارين' : 'Aperçu des exercices'}</span>
                  <span className="text-xs text-slate-400 ml-auto font-normal">
                    {aiInsights!.length} {aiInsights!.length > 1 ? 'items' : 'item'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className={`pl-6 py-2 text-sm text-slate-600 space-y-2 ${isArDoc ? 'text-right' : ''}`}>
                  {aiInsights!.map((item, i) => (
                    <div key={i} className="leading-relaxed">{item}</div>
                  ))}
                </div>
              </details>
            )}

            {hasKeyPoints && (
              <details className="group">
                <summary className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-primary-600 cursor-pointer list-none py-1.5">
                  <Target className="w-4 h-4 text-primary-500" />
                  <span>{isArDoc ? 'النقاط الرئيسية' : 'Points clés'}</span>
                  <span className="text-xs text-slate-400 ml-auto font-normal">
                    {mergedKP.length} {mergedKP.length > 1 ? 'notions' : 'notion'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className={`pl-6 py-2 flex flex-wrap gap-2 ${isArDoc ? 'justify-end' : 'justify-start'}`}>
                  {mergedKP.map((kp, i) => {
                    const palette = kp.isShort ? KP_PALETTE_SHORT : KP_PALETTE_LONG;
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
        )}
      </div>
    </div>
  );
}
