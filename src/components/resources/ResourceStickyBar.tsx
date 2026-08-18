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
 * Trigger logic (user feedback 2026-08-18, v3):
 * - The bar must be HIDDEN while the ResourceScribdHeader is even
 *   partially visible. It only appears once the bottom of the résumé
 *   card has scrolled above the fixed site header.
 * - Additionally, the bar must NOT appear while the site header itself
 *   is in the focal area (i.e. the user is "at the very top" of the
 *   page). This is a belt-and-braces protection: even if the résumé
 *   card has somehow scrolled above the header, we don't want the
 *   sticky bar to compete with the site header for visual attention.
 *   We achieve this by requiring the card's bottom to be at least
 *   20px above the site header bottom.
 *
 * Position: dynamic, derived from the actual site header height at
 * runtime. We query the <header> element and use its bottom edge as
 * the sticky bar's top. This handles future header height changes
 * without code changes.
 */
export default function ResourceStickyBar({ title, pageCount }: ResourceStickyBarProps) {
  const [visible, setVisible] = useState(false);
  const [topOffset, setTopOffset] = useState(62);

  useEffect(() => {
    const target = document.getElementById('resource-scribd-header');
    const siteHeader = document.querySelector('header');
    if (!target) return;

    let lastVisible = false;
    const check = () => {
      // Dynamic top: read the actual site header bottom. If the
      // header isn't found, fall back to a sensible default.
      const headerH = siteHeader
        ? siteHeader.getBoundingClientRect().height
        : window.matchMedia('(min-width: 1024px)').matches
          ? 73
          : 62;
      setTopOffset(headerH);

      const rect = target.getBoundingClientRect();
      // Show the sticky bar only when the entire résumé card has
      // scrolled at least 20px above the site header bottom. The 20px
      // buffer ensures the bar doesn't visually merge with the site
      // header (user feedback 2026-08-18).
      const shouldShow = rect.bottom <= headerH - 20;
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
