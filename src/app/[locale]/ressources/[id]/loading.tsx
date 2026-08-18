import { Loader2, Eye, Download, Star, MessageCircle, FileText, ChevronRight } from 'lucide-react';

// Per-route loading state for /ressources/[id]/[slug]

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* JSON-LD placeholders */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: '{}' }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: '{}' }} />

      <main className="flex-1 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <nav
            aria-label="Fil d'Ariane"
            className="flex items-center gap-1 text-xs text-slate-500 mb-4 flex-wrap"
          >
            <a className="h-3 w-12 bg-slate-200 rounded animate-pulse" aria-hidden="true" />
            <ChevronRight className="w-3 h-3 text-slate-300" aria-hidden="true" />
            <a className="h-3 w-16 bg-slate-200 rounded animate-pulse" aria-hidden="true" />
            <ChevronRight className="w-3 h-3 text-slate-300" aria-hidden="true" />
            <a className="h-3 w-20 bg-slate-200 rounded animate-pulse" aria-hidden="true" />
            <ChevronRight className="w-3 h-3 text-slate-300" aria-hidden="true" />
            <a className="h-3 w-16 bg-slate-200 rounded animate-pulse" aria-hidden="true" />
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
              already matched the page. */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              {/* Empty card — matches page.tsx empty card which has 0 children
                  for typical resources. The Product block (tech college only)
                  is hidden during loading. */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:p-8 mb-4"></div>

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
      </main>
    </div>
  );
}
