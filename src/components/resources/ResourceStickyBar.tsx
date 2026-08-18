'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, FileText } from 'lucide-react';

export interface ResourceStickyBarProps {
  title: string;
  pageCount?: number | null;
}

/**
 * Sticky bar that appears at the top of the viewport when the user scrolls
 * past the main ResourceScribdHeader. Shows a compact title + page count
 * + a back-to-top button.
 *
 * Implementation: an IntersectionObserver watches a sentinel placed just
 * above the sticky bar (e.g. just below the main header). When the sentinel
 * scrolls out of view, the sticky bar slides in.
 */
export default function ResourceStickyBar({ title, pageCount }: ResourceStickyBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById('sticky-bar-sentinel');
    if (!sentinel) return;
    // 2026-08-18 fix: a 0-height sentinel doesn't reliably trigger
    // IntersectionObserver (especially in some browsers). Also use
    // scroll listener as a fallback for robustness.
    let lastVisible = false;
    const check = () => {
      const rect = sentinel.getBoundingClientRect();
      // Sentinel is "out of view" when its top is above the header
      // (we use 64px to account for the fixed site header).
      const outOfView = rect.top < 64;
      if (outOfView !== lastVisible) {
        lastVisible = outOfView;
        setVisible(outOfView);
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

  return (
    <div
      aria-hidden={!visible}
      // 2026-08-18 fix: site Header is fixed at top-0 with z-50, h-16
      // (64px) on mobile and h-16 on desktop. The sticky bar must sit
      // BELOW the header so it doesn't get hidden behind it. Use top-16
      // (64px) to match. z-[60] keeps it above all other content but
      // below modal dialogs.
      className={`fixed top-16 left-0 right-0 z-[60] transition-transform duration-200 ease-out ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-12 flex items-center gap-3">
          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <h2 className="text-sm font-semibold text-slate-800 truncate flex-1 min-w-0">
            {title}
          </h2>
          {pageCount ? (
            <span className="text-xs text-slate-500 flex-shrink-0 hidden sm:inline">
              {pageCount} pages
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 flex-shrink-0"
            aria-label="Retour en haut"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Haut</span>
          </button>
        </div>
      </div>
    </div>
  );
}
