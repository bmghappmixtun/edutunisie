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

          {/* MAIN COLUMN */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              {/* AI summary skeleton */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:p-8 mb-4">
                <div className="h-5 w-32 bg-slate-200 rounded mb-4 animate-pulse" />
                <div className="space-y-3">
                  <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-4/5 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
