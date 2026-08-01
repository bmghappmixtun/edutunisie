import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Loader2 } from 'lucide-react';

/**
 * Per-route loading state for /ressources
 *
 * WHY THIS FILE EXISTS (fixes React #418/#419/#422 hydration mismatch):
 *
 * The page renders `<div className="min-h-screen flex flex-col bg-slate-50">`
 * wrapping Header + main (with page title + FilterShell) + Footer. Because
 * the page uses `await searchParams` + several async DB queries, Next.js
 * streams the response and uses this loading.tsx as the Suspense fallback.
 *
 * CRITICAL: the loading skeleton must use the SAME element types as the
 * page (e.g. `<h1>` for the title, `<p>` for the subtitle, `<a>` for the
 * resource cards, `<aside>` for the FilterShell sidebar, plus a
 * `<script type="application/ld+json">` placeholder when the page renders
 * its itemList JSON-LD). React's hydration check compares DOM element types
 * against the React tree, so a `<div>` skeleton where the page renders an
 * `<aside>` (or a missing script where the page has one) triggers #418/#422
 * (mismatch).
 *
 * History of fixes:
 *   - 2026-07-25 (commit 695b225): replaced <div> skeletons for title/subtitle
 *     with <h1>/<p> to match the page's actual element types.
 *   - 2026-07-26 (this commit): changed sidebar wrapper from <div> to <aside>
 *     to match FilterShell's actual element type, AND added a JSON-LD script
 *     placeholder so the wrapper's child count matches the page when the
 *     page renders the itemList schema (29-resource teacher pages, etc.).
 *
 * The page-level wrappers (`min-h-screen flex flex-col`, Header, main
 * padding, Footer) are mirrored byte-for-byte to keep the Suspense
 * fallback structure identical to the streamed content.
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Placeholder for the page's itemList JSON-LD script (rendered as the
          first child of the wrapper when there are resources). React's
          hydration check sees the same <script type="application/ld+json">
          element type and key on both sides, regardless of innerHTML. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: '{}' }}
      />

      <Header />

      <main className="flex-1 pt-24 lg:pt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page header skeleton — element types + child count MUST match
              page.tsx (h1 with 1 <span> child + p + progress-bar) to avoid
              React #418/#422 hydration mismatches when the page render fails
              and the loading skeleton remains in the DOM. The page renders
              <h1 class="...flex items-center gap-5"><span>{title}</span></h1>
              so the loading mirrors that with a single <span> wrapper holding
              the spinner. The <p> and the progress-bar <div> are self-closing
              (0 children) on BOTH sides — page.tsx and loading.tsx — so the
              leaf-level child count matches exactly. */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-extrabold mb-3 leading-tight text-slate-900 flex items-center gap-5">
              <span className="relative inline-flex items-center justify-center">
                <Loader2 className="relative w-12 h-12 lg:w-20 lg:h-20 text-primary-500 animate-spin" strokeWidth={2.5} />
              </span>
            </h1>
            {/* Self-closing p (0 children) matches page.tsx which has
                <p>{pageSubtitle}</p> with 1 text-only child — React handles
                text-only children flexibly, so the structural mismatch here
                was a non-issue. Kept as a skeleton bar. */}
            <p className="h-4 w-96 max-w-full bg-slate-100 rounded animate-pulse text-[0px] leading-none mt-2" />
            {/* Self-closing progress bar (0 children) matches page.tsx which
                has a self-closing placeholder div. Removed the inner animated
                bar — the wrapper itself is the skeleton. */}
            <div className="mt-4 w-72 h-1.5 bg-slate-200 rounded-full overflow-hidden" />
          </div>

          {/* FilterShell skeleton (sidebar + content) */}
          <div className="grid lg:grid-cols-[340px_1fr] gap-6">
            {/* Sidebar skeleton — structure MUST match FilterShell's actual
                render (see src/components/ressources/FilterShell.tsx ~line 305).
                The page renders the aside with TWO direct children:
                  1. <div class="px-5 py-4 border-b ...">  (header with h3 inside)
                  2. <div class="max-h-[calc(100vh-180px)] overflow-y-auto px-5 py-4 space-y-5">  (scrollable content with filter sections)
                The previous version had <h2> as the first child (loading) vs
                <div> as the first child (page) — this element-type mismatch
                broke the streaming-Suspense patch from loading→page and
                triggered React #418/#422 hydration errors on /ressources and
                /ressources?teacherId=* (ERR-AYVRJF, ERR-BW6UCW, ERR-HHXMBP,
                ERR-RSBVVC — 12 errors total in 2026-07-27 digest). */}
            <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm h-fit lg:sticky lg:top-24 overflow-hidden">
              {/* Header skeleton — <div> wrapper with <h3> inside, matching
                  the page's actual structure. */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="h-4 w-24 bg-slate-200 rounded animate-pulse text-[0px] leading-none" />
              </div>
              {/* Content skeleton — same wrapper as the page (max-h + overflow-y
                  + px-5 py-4 space-y-5) so the Suspense patch lands cleanly. */}
              <div className="max-h-[calc(100vh-180px)] overflow-y-auto px-5 py-4 space-y-5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                    <div className="flex flex-wrap gap-1.5">
                      {[...Array(3)].map((__, j) => (
                        <div
                          key={j}
                          className="h-6 w-16 bg-slate-100 rounded-full animate-pulse"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {/* Active-filter-chips wrapper placeholder.
               * The page (FilterShell.tsx ~line 710) ALWAYS renders this 3rd
               * child of <aside>, hidden via CSS when activeCount === 0.
               * Without this placeholder, the aside has 2 children in the
               * skeleton but 3 children in the streamed page → React #418/#422
               * hydration mismatch on /ressources?teacherId=* (ERR-YH74LU
               * 12 events, ERR-BX5EQZ 10 events in 2026-08-01 nightly digest). */}
              <div className="hidden" aria-hidden="true" />
            </aside>

            {/* Content skeleton — <div> wrappers match the page's
                <FilterShell> render (toolbar div + grid div). */}
            <div className="space-y-4">
              {/* Toolbar skeleton */}
              <div className="h-14 bg-white rounded-xl border border-slate-200 animate-pulse" />
              {/* Grid of cards skeleton — each card uses <a> wrapper to match
                  the page's <Link> render (Link also renders as <a>). */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => (
                  <a
                    key={i}
                    className="bg-white rounded-2xl border border-slate-100 overflow-hidden block"
                  >
                    <div className="aspect-[4/3] bg-slate-100 animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-1/3 animate-pulse" />
                      <h3 className="h-4 bg-slate-100 rounded animate-pulse text-[0px] leading-none" />
                      <p className="h-3 bg-slate-100 rounded w-2/3 animate-pulse text-[0px] leading-none" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
