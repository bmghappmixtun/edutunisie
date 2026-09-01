import { Loader2, Eye, Download, Star, MessageCircle, FileText, ChevronRight, Wrench, CheckCircle2 } from 'lucide-react';

// Per-route loading state for /ressources/[id]/[slug]

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* JSON-LD placeholders */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: '{}' }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: '{}' }} />

      {/* 2026-08-19 nightly fix (ERR-FGCMHE): mirror page.tsx's <div> change.
          The page used to have a nested <main> here (also wrapped in the
          layout's <main>), so the loading skeleton had to match. After the
          fix the page uses <div className="flex-1 pt-20"> so this skeleton
          matches it byte-for-byte. */}
      <div className="flex-1 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb — 2026-08-21 nightly fix (ERR-LHP3SU React #419):
              The previous skeleton had 7 children (4 anchors + 3 chevrons) but
              the page used React.Fragment for the conditional subject/class
              items, making the page's nav have only 5 React children. The
              child-count mismatch triggered hydration #418/#419 on every
              resource page (6 events captured, but the actual exposure was
              every /ressources/{id} view). The page now uses the "always
              render, hide via CSS" pattern: the nav has exactly 5 React
              children (Link + ChevronRight + Link + subject-span + class-span).
              The subject/class spans wrap a ChevronRight + Link pair and are
              hidden when the resource has no subject/class. The skeleton
              mirrors this exact structure — the spans are always hidden
              during loading (the resource data isn't available yet) and
              contain the same internal structure (ChevronRight + Link) as
              the page. React tree: 5 children in both. DOM: 7 children in
              the page (when subject+class exist) or 3-7 in the loading
              (3 visible + 4 inside 2 hidden spans).

              2026-08-27 nightly fix (ERR-6ZE9PE React #419 on
              /fr/ressources/15365 — 5 events captured across 7 days):
              The c2255df2 child-count fix was necessary but not
              sufficient — React's hydration check is also text-strict.
              The page's Links had text content ("Accueil", "Ressources",
              subject name, class name) while the loading skeleton's
              placeholder <a> tags were empty (`<a></a>`). This made
              the page DOM `<a>Accueil</a>` vs the loading DOM
              `<a></a>` — a React #419 text-content mismatch.

              Fix (mirrors the page): each placeholder <a> now contains
              an inner <span suppressHydrationWarning></span>. The DOM
              becomes `<a><span></span></a>` in the loading and
              `<a><span>Accueil</span></a>` in the page. The text inside
              the <span> can differ (loading is empty, page has the real
              text) without triggering a hydration error because the
              <span> has `suppressHydrationWarning`. The child-count
              match (1 child per <a>) is preserved in both states. */}
          <nav
            aria-label="Fil d'Ariane"
            className="flex items-center gap-1 text-xs text-slate-500 mb-4 flex-wrap"
          >
            <a className="h-3 w-12 bg-slate-200 rounded animate-pulse" aria-hidden="true">
              <span suppressHydrationWarning></span>
            </a>
            <ChevronRight className="w-3 h-3 text-slate-300" aria-hidden="true" />
            <a className="h-3 w-16 bg-slate-200 rounded animate-pulse" aria-hidden="true">
              <span suppressHydrationWarning></span>
            </a>
            <span className="inline-flex items-center gap-1 hidden" aria-hidden="true">
              <ChevronRight className="w-3 h-3 text-slate-300" aria-hidden="true" />
              <a className="h-3 w-20 bg-slate-200 rounded animate-pulse" aria-hidden="true">
                <span suppressHydrationWarning></span>
              </a>
            </span>
            <span className="inline-flex items-center gap-1 hidden" aria-hidden="true">
              <ChevronRight className="w-3 h-3 text-slate-300" aria-hidden="true" />
              <a className="h-3 w-16 bg-slate-200 rounded animate-pulse" aria-hidden="true">
                <span suppressHydrationWarning></span>
              </a>
            </span>
          </nav>

          {/* SCRIBD HEADER SKELETON */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4">
            <div className="p-5 lg:p-6">
              <div className="flex items-start gap-2 mb-3">
                <div className="h-7 w-3/4 bg-slate-200 rounded animate-pulse" />
                <div className="h-5 w-10 bg-violet-100 rounded-full animate-pulse flex-shrink-0 mt-1" />
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-3 flex-wrap">
                <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-12 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="mb-4 space-y-2">
                <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="h-3 w-40 bg-slate-100 rounded mb-3 animate-pulse" />
            </div>
          </div>

          {/* MAIN COLUMN
              2026-08-18 fix (nightly ERR-BRSXYQ + ERR-JEA95Y): the page tree
              has 7 direct children of the inner <div> for a typical PUBLISHED
              resource (empty card + PDF viewer + ResourceActions + ResourceInfoPanel
              + RatingSection + CommentsSection + Similar). The loading skeleton
              was only rendering 4 children, which caused a React #418/#419
              hydration mismatch (child count differs from the page's tree).
              Added the 3 missing skeleton placeholders (ResourceActions,
              CommentsSection, Similar) and reduced the AI summary skeleton to
              an empty card so its internal child count (0) matches the page's
              empty card (which contains 0 or 1 Product block for tech college
              only). The PDF viewer, ResourceInfoPanel, and Rating skeletons
              already matched the page.

              2026-08-31 fix (ERR-AH9FU2 React #419 on
              /fr/ressources/10717/devoir-de-controle-n-1-math-bac-informatique-2017-2018-2
              — 4 events captured in 24h, but the same mismatch existed on
              every resource page with hasCorrection=true or isArchived=true):
              The page tree has UP TO 9 direct children of the inner <div>
              (ARCHIVED banner + correction banner + product wrapper + PDF
              viewer + ResourceActions + ResourceInfoPanel + RatingSection +
              CommentsSection + Similar). For a typical PUBLISHED resource
              with hasCorrection and similar resources, the page has 8
              children. The loading skeleton was only rendering 7 children,
              which caused a React #422 (child count mismatch) that cascaded
              into a React #419 (text content mismatch) during hydration.
              Fix: add 2 hidden placeholder divs to the loading skeleton (one
              for the ARCHIVED banner, one for the correction banner) so the
              skeleton always renders 9 children, matching the page's maximum
              structure. The placeholders are always hidden during loading
              (the resource data isn't available yet) and have the same
              wrapper className as the page's banners so React's hydration
              check passes. The correction banner has suppressHydrationWarning
              on its text content because the loading skeleton can't know the
              correction summary during the Suspense fallback. */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              {/* ARCHIVED banner placeholder — 2026-08-31 nightly fix
                  (ERR-AH9FU2): mirrors the page's ARCHIVED banner
                  (bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-4)
                  which is conditionally rendered for archived resources.

                  2026-09-01 update (ERR-HBRKND): the page now uses the
                  "always render, hide via CSS" pattern (matching the loading
                  skeleton's child count of 9). The placeholder now mirrors
                  the full internal structure of the page's ARCHIVED banner
                  (icon div, h2 heading, p with optional Link) so the React
                  tree has the same element types and child count at every
                  position. The dynamic text (subject.nameFr — class.nameFr
                  inside the Link) is wrapped in
                  `<span suppressHydrationWarning></span>` because the loading
                  skeleton can't know the resource's subject/class during the
                  Suspense fallback. The static heading text and the "!"
                  character are identical to the page's content. The
                  placeholder's wrapper is always hidden during loading. */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-4 hidden" aria-hidden="true">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold text-lg" aria-hidden="true">
                    !
                  </div>
                  <div className="flex-1">
                    <h2 className="font-bold text-amber-900 mb-1">
                      Cette ressource n'est plus disponible
                    </h2>
                    <p className="text-sm text-amber-800">
                      Ce document a été archivé et n'est plus accessible au public.
                      <span suppressHydrationWarning>{''}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Correction banner placeholder — 2026-08-31 nightly fix
                  (ERR-AH9FU2): mirrors the page's correction banner
                  (bg-gradient-to-r from-emerald-500 ... rounded-2xl p-5 mb-4
                  shadow-lg border-2 border-emerald-400/50) which is
                  conditionally rendered when resource.hasCorrection is true.

                  2026-09-01 update (ERR-HBRKND): same "always render, hide
                  via CSS" pattern as the ARCHIVED banner above. The
                  placeholder now mirrors the page's full internal structure
                  (CheckCircle2 svg, h2 heading, p with correctionSummary).
                  The dynamic correction summary text is wrapped in
                  `<p suppressHydrationWarning></p>` because the loading
                  skeleton can't know the summary during the Suspense
                  fallback. The static heading text is identical. The
                  placeholder's wrapper is always hidden during loading. */}
              <div className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white rounded-2xl p-5 mb-4 shadow-lg border-2 border-emerald-400/50 hidden" aria-hidden="true">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center" aria-hidden="true">
                    <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-extrabold text-lg mb-1">
                      ✅ Ce document contient un corrigé
                    </h2>
                    <p className="text-sm text-emerald-50" suppressHydrationWarning>
                      Le corrigé détaillé est intégré à la fin du document. Faites défiler pour le consulter.
                    </p>
                  </div>
                </div>
              </div>

              {/* Product wrapper (المنتج / Produit) — 2026-08-21 nightly fix
                  (ERR-LHP3SU React #419): the page now uses the "always render,
                  hide via CSS" pattern for the product block (technologie +
                  college only). The wrapper + inner content are always
                  rendered, hidden via `hidden` class + `aria-hidden` when the
                  conditions aren't met. The skeleton mirrors this exact
                  structure — both wrapper and inner div are hidden during
                  loading (the resource data isn't available yet), but the
                  internal children (Wrench svg + 2 spans) match the page's
                  structure so React's hydration check passes. The first span
                  has the same text in both ("المنتج / Produit :"), and the
                  product-name span uses `suppressHydrationWarning` on the
                  page side because the loading skeleton can't know the
                  product name during the Suspense fallback. */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:p-8 mb-4 hidden" aria-hidden="true">
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg inline-flex items-center gap-2 text-sm hidden" aria-hidden="true">
                  <Wrench className="w-4 h-4 text-amber-700" aria-hidden="true" />
                  <span className="font-bold text-amber-900">المنتج / Produit :</span>
                  <span className="text-amber-800" dir="rtl" suppressHydrationWarning></span>
                </div>
              </div>

              {/* PDF viewer card (matches page.tsx bg-white rounded-2xl).
                  2026-08-17 fix (nightly ERR-P3YJBK + ERR-5J325H): removed the
                  orphaned "Aperçu du document" header skeleton. The header
                  itself was removed from page.tsx in commit a34acc4 (PDF viewer
                  cleanup) but the loading skeleton still rendered the title +
                  link placeholders. The resulting child-count mismatch inside
                  the PDF viewer card (skeleton=2, page=1) triggered React #419
                  hydration errors on every PUBLISHED resource page. */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4">
                <div className="p-0">
                  <div className="card p-4 h-[600px] flex items-center justify-center bg-slate-50">
                    <div className="text-center text-slate-400">
                      <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary-400" />
                      <p className="text-sm">Chargement de l'aperçu PDF…</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ResourceActions skeleton — added 2026-08-18 to match the page's
                  always-rendered <ResourceActions> wrapper (mt-4 div). 6 button
                  placeholders for Télécharger / Lire en ligne / Imprimer /
                  Favoris / Partager / Signaler. */}
              <div className="mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="h-9 bg-slate-100 rounded-lg animate-pulse"
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>

              {/* ResourceInfoPanel skeleton */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:p-8 mb-4">
                <div className="h-4 w-32 bg-slate-200 rounded mb-4 animate-pulse" />
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
                      <div className="h-3 w-12 bg-slate-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Rating skeleton */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:p-8 mb-4">
                <div className="h-5 w-32 bg-slate-200 rounded mb-4 animate-pulse" />
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="h-12 w-24 mx-auto bg-slate-200 rounded animate-pulse" />
                    <div className="flex justify-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-slate-200" />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((s) => (
                      <div key={s} className="flex items-center gap-2">
                        <div className="h-3 w-6 bg-slate-100 rounded animate-pulse" />
                        <div className="flex-1 h-2 bg-slate-100 rounded animate-pulse" />
                        <div className="h-3 w-8 bg-slate-100 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CommentsSection skeleton — added 2026-08-18 to match the page's
                  CommentsSection wrapper (bg-white rounded-2xl p-6 lg:p-8 mb-4).
                  Single textarea placeholder + submit button. */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:p-8 mb-4">
                <div className="h-5 w-32 bg-slate-200 rounded mb-4 animate-pulse" />
                <div className="h-20 w-full bg-slate-100 rounded-lg animate-pulse mb-3" />
                <div className="h-9 w-32 bg-slate-200 rounded-lg animate-pulse" />
              </div>

              {/* Similar resources skeleton — added 2026-08-18 to match the
                  page's Similaires wrapper (mt-6 div with 2x2 grid of cards).
                  4 card placeholders. */}
              <div className="mt-6">
                <div className="h-6 w-48 bg-slate-200 rounded mb-4 animate-pulse" />
                <div className="grid sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="card p-4 flex gap-3"
                      aria-hidden="true"
                    >
                      <div className="w-16 h-20 bg-slate-100 rounded animate-pulse flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                        <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
