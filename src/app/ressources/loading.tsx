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
 *   - 2026-08-04 (commit afbcf79): always-rendered the active-filter chips
 *     wrapper to fix React #418/#422 hydration mismatches when chips were
 *     absent vs present.
 *   - 2026-08-05 (this commit): the sidebar previously had 5 fixed skeleton
 *     filter sections, but the page renders up to 8 conditional sections
 *     (Type, Matière, Classe, Section, Année, Trimestre, Langue, Options).
 *     A child-count mismatch at the sidebar level (5 vs N) was triggering
 *     React #418/#422 on /ressources?subject=anglais&... (ERR-SGFVDH 5x,
 *     ERR-XCZNW4 5x, 2026-08-05 nightly digest). The page now also always
 *     renders both the results grid AND the empty state as siblings
 *     (hidden via CSS), so the main <div> has 5 children: toolbar, chips
 *     wrapper, grid, empty state, pagination wrapper. We mirror that
 *     exactly here.
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
              {/* Header skeleton — MUST mirror the page's actual structure.
                  The page (FilterShell.tsx ~line 349) renders this <div> with
                  TWO children: <h3> (icon + label + always-rendered activeCount
                  badge) + <button> (always-rendered Reset, hidden via CSS when
                  activeCount === 0). The previous version had only the <h3>,
                  so the wrapper had 1 child in the loading but 2 in the page,
                  triggering React #418/#422 hydration mismatches on
                  /ressources and /ar/ressources (ERR-FMJA5L, ERR-ABLXX4,
                  2026-08-03 nightly digest, 6 errors). The h3 itself also
                  needs 3 children to match the page (icon + label span +
                  activeCount span). */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-extrabold text-sm flex items-center gap-2 text-slate-900">
                  <span className="w-4 h-4 rounded bg-slate-200 animate-pulse" />
                  <span className="h-3 w-12 bg-slate-200 rounded animate-pulse" />
                  {/* Always-rendered activeCount badge (hidden via CSS — see
                      FilterShell.tsx comment for the rationale). */}
                  <span className="ml-1 hidden w-5 h-5 rounded-full bg-slate-200 animate-pulse" aria-hidden="true" />
                </h3>
                {/* Always-rendered Reset button skeleton (hidden via CSS). */}
                <button
                  type="button"
                  className="hidden w-12 h-6 rounded bg-slate-100 animate-pulse"
                  aria-hidden="true"
                  tabIndex={-1}
                />
              </div>
              {/* Content skeleton — same wrapper as the page (max-h + overflow-y
                  + px-5 py-4 space-y-5) so the Suspense patch lands cleanly.
                  IMPORTANT (2026-08-05): the page renders up to 9 top-level
                  filter sections (Recherche, Type, Matière, Classe, Section,
                  Année, Trimestre, Langue, Options, then the always-rendered
                  Catégorie wrapper). We render 9 skeleton sections here so
                  the sidebar's child count matches in all cases — the page
                  wraps each section in <div className="hidden"> when the
                  corresponding facet is empty, so on hydrate the React
                  walker sees the same number of children here as it saw on
                  the SSR pass. The previous version rendered only 5 sections,
                  which mismatched the page's 9 on most filtered views
                  (ERR-SGFVDH 5x #422, ERR-XCZNW4 5x #418, 2026-08-05 digest). */}
              <div className="max-h-[calc(100vh-180px)] overflow-y-auto px-5 py-4 space-y-5">
                {/* 1. Recherche — input skeleton (no chips, just a label + input) */}
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                  <div className="h-9 w-full bg-slate-50 rounded-lg animate-pulse" />
                </div>
                {/* 2-9. Filter chip groups (Type, Matière, Classe, Section, Année, Trimestre, Langue, Options) */}
                {[...Array(8)].map((_, i) => (
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
            </aside>

            {/* Content skeleton — <div> wrappers match the page's
                <FilterShell> render (main div now contains 5 children:
                toolbar + chips wrapper + results-grid + empty-state + pagination).
                The chips wrapper, empty state, and pagination are always
                rendered on the page (with `hidden` when inactive), so we
                mirror them here as zero-height placeholders to keep the
                child count stable between the Suspense fallback and the
                streamed page — preventing React #418/#422 hydration
                mismatches on /ressources and /ar/ressources?teacherId=*.
                (ERR-S7BZMN 11x #418, ERR-386KSC 10x #422, ERR-EZ9NCC 1x #418,
                ERR-F5AYFT 1x #422 in 2026-08-02 nightly digest;
                ERR-SGFVDH 5x + ERR-XCZNW4 5x + ERR-Y87HMD 4x in 2026-08-05). */}
            <div className="space-y-4">
              {/* Toolbar skeleton */}
              <div className="h-14 bg-white rounded-xl border border-slate-200 animate-pulse" />
              {/* Active-filter-chips wrapper placeholder.
               * The page (FilterShell.tsx ~line 740) ALWAYS renders this 2nd
               * child of the main <div> as a 2-level wrapper:
               *   <div className="flex flex-wrap gap-1.5 mb-4 hidden" aria-hidden>
               *     <ActiveFilterChips />  ← also always rendered; returns an
               *                                empty <div hidden> when no chips
               *   </div>
               * We mirror that exact 2-level structure so the streaming patch
               * from loading→page does not see a child-count change at any
               * wrapper, which is what triggers React #418/#422 hydration
               * mismatches (2026-08-04: ERR-UJT75R 5x #422, ERR-572C9N 5x
               * #418, ERR-HKCF93 1x, ERR-TEU2DB 1x — 12 events). */}
              <div className="flex flex-wrap gap-1.5 mb-4 hidden" aria-hidden="true">
                <div className="flex flex-wrap gap-1.5 mb-4 hidden" aria-hidden="true" />
              </div>
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
              {/* Empty-state placeholder.
               * The page (FilterShell.tsx ~line 766) ALWAYS renders a sibling
               * empty-state <div> next to the grid, hidden via CSS when there
               * are results. We mirror that here as a zero-height placeholder
               * so the main <div>'s child count is 5 in BOTH the skeleton and
               * the streamed page. Without this, when the page renders 0
               * results (e.g. /ressources?class=7eme&subject=svt&type=HOMEWORK),
               * the streamed HTML has the empty-state div (4 children) at
               * position 3, but the skeleton has the grid (6 <a> children) at
               * position 3 — a #418/#422 child-count and child-type mismatch.
               * 2026-08-05: ERR-Y87HMD (4x #418). */}
              <div className="bg-white rounded-2xl border border-slate-200 p-12 hidden" aria-hidden="true" />
              {/* Pagination placeholder.
               * The page (FilterShell.tsx ~line 800) renders <Pagination> as
               * the 5th child of the main <div> when totalPages > 1, which is
               * true for the vast majority of /ressources pages (e.g. 560 pages
               * for 13k+ resources at 24/page). Without this placeholder, the
               * main <div> has 4 children in the skeleton but 5 in the streamed
               * page, triggering the same #418/#422 mismatch. */}
              <div className="hidden" aria-hidden="true" />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
