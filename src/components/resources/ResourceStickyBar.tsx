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
 * Trigger logic (user feedback 2026-08-18): the bar must be HIDDEN while
 * the ResourceScribdHeader is even partially visible. It only appears
 * once the bottom of the résumé card has scrolled above the fixed site
 * header. We watch the ScribdHeader element directly (not a sentinel
 * placed after it) so the threshold is the actual bottom edge of the
 * card, not a magic 64px number.
 *
 * Position: `top-[62px] lg:top-[73px]` to match the site header heights
 * (h-[62px] lg:h-[73px] in src/components/layout/Header.tsx). The
 * earlier `top-16` (64px) overlapped the 73px desktop header and hid
 * the bottom of the Examanet logo.
 */
export default function ResourceStickyBar({ title, pageCount }: ResourceStickyBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById('resource-scribd-header');
    if (!target) return;

    // The site header is 62px on mobile, 73px on lg+. Match it so the
    // sticky bar sits flush below the header.
    const getHeaderHeight = () =>
      window.matchMedia('(min-width: 1024px)').matches ? 73 : 62;

    let lastVisible = false;
    const check = () => {
      const rect = target.getBoundingClientRect();
      // Show the sticky bar only when the ENTIRE résumé card has
      // scrolled above the site header. rect.bottom <= headerHeight
      // means the card's bottom edge is at or above the header.
      const shouldShow = rect.bottom <= getHeaderHeight();
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
      className={`fixed top-[62px] lg:top-[73px] left-0 right-0 z-[60] transition-transform duration-200 ease-out ${
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
