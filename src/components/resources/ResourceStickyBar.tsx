'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, FileText } from 'lucide-react';

export interface ResourceStickyBarProps {
  title: string;
  pageCount?: number | null;
}

/**
 * Sticky bar that appears at the top of the viewport when the user has
 * scrolled past the site header. Shows a compact title + page count +
 * a back-to-top button.
 *
 * Trigger logic (user feedback 2026-08-18, v5 — ultra simple):
 * The bar shows only when window.scrollY > HEADER_HEIGHT + 50.
 * That's it. No bounding rect checks, no card position tracking —
 * those introduced edge cases on initial render (user kept seeing
 * the bar at the top of the page even with scrollY = 0).
 *
 * Mental model: "the sticky bar should never appear in the same
 * vertical zone as the site header". The site header sits at the
 * top of the page. Once the user has scrolled past it (with a 50px
 * buffer), the sticky bar can take its place.
 *
 * Position: dynamic, derived from the actual site header height at
 * runtime (queries the <header> element on mount + on resize).
 */
const SHOW_THRESHOLD_PX = 50; // buffer below the header

export default function ResourceStickyBar({ title, pageCount }: ResourceStickyBarProps) {
  const [visible, setVisible] = useState(false);
  const [topOffset, setTopOffset] = useState(62);

  useEffect(() => {
    const siteHeader = document.querySelector('header');
    if (!siteHeader) return;

    let lastVisible = false;
    const check = () => {
      // Dynamic top: read the actual site header height.
      const headerH = siteHeader.getBoundingClientRect().height;
      setTopOffset(headerH);

      // Show only when scrolled past the header + buffer.
      const shouldShow = window.scrollY > headerH + SHOW_THRESHOLD_PX;
      if (shouldShow !== lastVisible) {
        lastVisible = shouldShow;
        setVisible(shouldShow);
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
      style={{ top: topOffset }}
      className={`fixed left-0 right-0 z-[60] transition-transform duration-200 ease-out ${
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
