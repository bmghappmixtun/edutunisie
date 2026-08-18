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
 * Trigger logic (user feedback 2026-08-18, v4 — final):
 * The bar must be hidden whenever the user is in the "header zone" of
 * the page — that is, anywhere the Examanet site header is the focal
 * element. This is simpler and more reliable than tracking the résumé
 * card's bounding rect, and matches the user's mental model: "the
 * sticky bar should never compete with the site header for attention."
 *
 * Two conditions must BOTH be true to show the bar:
 *  1. window.scrollY > headerHeight + 50 (the user has scrolled past
 *     the site header by at least 50px — a clear visual buffer).
 *  2. The résumé card (#resource-scribd-header) is fully out of view
 *     (rect.bottom <= 0). This ensures the bar doesn't appear while
 *     the user is still reading the résumé.
 *
 * Position: dynamic, derived from the actual site header height at
 * runtime. We query the <header> element and use its height as the
 * sticky bar's top offset. This handles future header height changes
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
      const headerH = siteHeader
        ? siteHeader.getBoundingClientRect().height
        : window.matchMedia('(min-width: 1024px)').matches
          ? 73
          : 62;
      setTopOffset(headerH);

      const cardRect = target.getBoundingClientRect();
      // 2026-08-18 v4: primary condition is scrollY. The user wants
      // the bar hidden whenever the site header is in the focal area.
      // Once the user has scrolled past the header (scrollY > headerH),
      // the secondary check is whether the résumé card is still
      // visible — if it is, we still wait until the user has scrolled
      // past it.
      const pastHeader = window.scrollY > headerH + 50;
      const cardOutOfView = cardRect.bottom <= headerH;
      const shouldShow = pastHeader && cardOutOfView;
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
