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
  Download,
  Bookmark,
  Share2,
  Printer,
  Code2,
  Sparkles,
  Flag,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
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
  downloadUrl: string;
  teacherName?: string | null;
  teacherProfileUrl?: string | null;
  initialIsFavorited?: boolean;
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
  downloadUrl,
  teacherName,
  teacherProfileUrl,
  initialIsFavorited = false,
  aiImproved = true,
}: ResourceScribdHeaderProps) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [busy, setBusy] = useState<'fav' | null>(null);

  const hasLongDescription = (description?.length ?? 0) > TRUNCATE_AT;
  const visibleDescription = hasLongDescription && !expanded
    ? description!.slice(0, TRUNCATE_AT).trimEnd() + '…'
    : description;

  // ---- Handlers (all internal, no event-handler props) ----

  const handleDownload = () => {
    if (typeof window === 'undefined' || !downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${title}.pdf`;
    a.click();
  };

  const handleFavorite = async () => {
    if (busy === 'fav') return;
    setBusy('fav');
    try {
      const res = await fetch(`/api/favorites/${resourceId}`, { method: 'POST' });
      if (res.status === 401) {
        // Soft fail — user not logged in. Don't crash, just reflect the current state.
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('examanet:toast', {
            detail: { type: 'error', message: 'Connectez-vous pour ajouter aux favoris' }
          }));
        }
        return;
      }
      if (res.ok) {
        setIsFavorited((f) => !f);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('examanet:toast', {
            detail: { type: 'success', message: 'Ajouté aux favoris' }
          }));
        }
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('examanet:toast', {
          detail: { type: 'error', message: 'Erreur réseau' }
        }));
      }
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const nav = navigator as any;
    if (nav.share) {
      try {
        await nav.share({ title, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        window.dispatchEvent(new CustomEvent('examanet:toast', {
          detail: { type: 'success', message: 'Lien copié !' }
        }));
        return;
      } catch {
        // ignore
      }
    }
    // Last-resort: open a prompt with the URL
    window.prompt('Copiez ce lien :', url);
  };

  const handlePrint = () => {
    if (typeof window === 'undefined') return;
    window.print();
  };

  const handleEmbed = async () => {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const embed = `<iframe src="${origin}${downloadUrl}" width="100%" height="600" frameborder="0"></iframe>`;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(embed);
        window.dispatchEvent(new CustomEvent('examanet:toast', {
          detail: { type: 'success', message: 'Code d\'intégration copié !' }
        }));
      } catch {
        window.prompt('Copiez ce code d\'intégration :', embed);
      }
    } else {
      window.prompt('Copiez ce code d\'intégration :', embed);
    }
  };

  const handleAskAI = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('examanet:ask-ai', { detail: { resourceId } }));
  };

  const handleReport = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('examanet:toast', {
      detail: { type: 'info', message: 'Pour signaler un problème, contactez-nous via la page Contact.' }
    }));
  };

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

        {/* Stats line — Scribd style */}
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> {formatNumber(viewsCount)} vues
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

        {/* Action buttons — Scribd-style grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-3">
          <ActionButton
            icon={<Download className="w-5 h-5" />}
            label="Télécharger"
            onClick={handleDownload}
            primary
          />
          <ActionButton
            icon={<Bookmark className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />}
            label="Enregistrer"
            onClick={handleFavorite}
            active={isFavorited}
            disabled={busy === 'fav'}
          />
          <ActionButton
            icon={<Share2 className="w-5 h-5" />}
            label="Partager"
            onClick={handleShare}
          />
          <ActionButton
            icon={<Printer className="w-5 h-5" />}
            label="Imprimer"
            onClick={handlePrint}
          />
          <ActionButton
            icon={<Code2 className="w-5 h-5" />}
            label="Intégrer"
            onClick={handleEmbed}
          />
        </div>

        {/* Secondary actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAskAI}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-3 py-1.5 rounded-full transition"
          >
            <Sparkles className="w-3.5 h-3.5" /> Ask AI
          </button>
          <button
            onClick={handleReport}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full transition"
          >
            <Flag className="w-3.5 h-3.5" /> Signaler
          </button>

          {/* Feedback thumbs for AI improvement (Scribd has this too) */}
          {aiImproved && (
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setFeedback('up')}
                className={`p-1.5 rounded transition ${
                  feedback === 'up' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Améliorations utiles"
                aria-label="Feedback positif"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setFeedback('down')}
                className={`p-1.5 rounded transition ${
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
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  primary,
  active,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  primary?: boolean;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl border transition text-center ${
        primary
          ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white shadow-sm disabled:opacity-60'
          : active
            ? 'bg-primary-50 border-primary-200 text-primary-700'
            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
      } disabled:cursor-not-allowed`}
    >
      <div className={primary ? 'text-white' : ''}>{icon}</div>
      <span className="text-[11px] font-semibold leading-tight">{label}</span>
    </button>
  );
}
