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
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel is out of view, show the sticky bar
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '0px 0px 0px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed top-0 left-0 right-0 z-30 transition-transform duration-200 ease-out ${
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
