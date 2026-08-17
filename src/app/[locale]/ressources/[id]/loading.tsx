import { Loader2, Eye, Download, Star, MessageCircle, FileText, ChevronRight } from 'lucide-react';

// Per-route loading state for /ressources/[id]/[slug]
// Shows a skeleton while the page async data is being fetched.
// MUST mirror the page outer element types/structure to avoid
// React 418/422/419 hydration mismatches.
// 2026-08-17: page layout refactored — sidebar removed, single column.
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* JSON-LD placeholders matching the 2 scripts in the page (course + breadcrumb).
          The page renders them as the FIRST children of the wrapper, so the loading
          must too — placing them inside <main> (the previous version) produced a
          structural mismatch when the Suspense fallback was replaced by the streamed
          content, triggering React #418/#422 hydration errors. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: '{}' }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: '{}' }} />

      <main className="flex-1 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb nav skeleton — MUST be a <nav> with 7 children of
              <a>/<svg> to match the page's <Link> + <ChevronRight /> structure.
              For a PUBLISHED resource with subject + class, the page renders
              exactly 7 children: 4 <Link> + 3 <ChevronRight />. */}
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

          {/* === SCRIBD HEADER SKELETON (NEW 2026-08-17) === */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4">
            <div className="p-5 lg:p-6">
              {/* Title row */}
              <div className="flex items-start gap-2 mb-3">
                <div className="h-7 w-3/4 bg-slate-200 rounded animate-pulse" />
                <div className="h-5 w-10 bg-violet-100 rounded-full animate-pulse flex-shrink-0 mt-1" />
              </div>
              {/* Stats line (vues, téléchargements, note, commentaires, pages, taille) */}
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-3 flex-wrap">
                <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-12 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
              </div>
              {/* Description skeleton (2 lines) */}
              <div className="mb-4 space-y-2">
                <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-slate-100 rounded animate-pulse" />
              </div>
              {/* Transféré par */}
              <div className="h-3 w-40 bg-slate-100 rounded mb-3 animate-pulse" />
            </div>
          </div>

          {/* MAIN COLUMN — now single-column since the sidebar was removed */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              {/* AI-generated summary skeleton (when aiSummary.summary exists).
                  2026-08-17: removed the "Résumé intelligent" card from page.tsx
                  (was redundant with the ScribdHeader description). The hidden
                  placeholder that was here was also removed to keep the child
                  count in sync. */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:p-8 mb-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:p-8 mb-4">
                <div className="h-5 w-32 bg-slate-200 rounded mb-4 animate-pulse" />
                <div className="space-y-3">
                  <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-4/5 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>

              {/* PDF viewer card (matches page.tsx bg-white rounded-2xl) */}
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

              {/* Action buttons skeleton (ResourceActions — moved here 2026-08-17
                  from above the PDF viewer to right under it). 6 buttons in
                  a 3-column grid. */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-10 bg-slate-200 rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>

              {/* ResourceInfoPanel skeleton (NEW 2026-08-17 — moved from sidebar
                  to below the PDF viewer, full-width) */}
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

              {/* Rating section skeleton (matches RatingSection root div) */}
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
                    <div className="h-3 w-16 mx-auto bg-slate-100 rounded animate-pulse" />
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

              {/* Comments section skeleton (matches CommentsSection root div) */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:p-8 mb-4">
                <div className="h-5 w-32 bg-slate-200 rounded mb-4 animate-pulse" />
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-3 pb-4 border-b border-slate-100 last:border-0">
                      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-slate-200 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
                        <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                        <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Similar resources (matches page.tsx mt-6 div) */}
              <div className="mt-6">
                <h2 className="font-bold text-xl mb-4">📚 Ressources similaires</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="card p-4 flex gap-3">
                      <div className="w-16 h-20 bg-slate-200 rounded animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded animate-pulse" />
                        <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
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
