import { Loader2, FileText, Star, Eye, Download, MessageCircle, ChevronRight } from 'lucide-react';

/**
 * Per-route loading state for /ressources/[id]/[slug]
 *
 * Shows a skeleton with the Examanet loading icon while the page's
 * async data (prisma query, auth, ratings) is being fetched.
 *
 * MUST mirror the page's outer element types/structure to avoid
 * React #418/#422/#419 hydration mismatches (div wrapping 2 JSON-LD
 * scripts + main + grid + aside, nav with 7 children of <a>/<svg>,
 * main column with 5 children: title card, PDF viewer, rating,
 * comments, similar).
 *
 * 2026-08-12 update (nightly ERR-89ZHBA / ERR-MZTSGR):
 *   - breadcrumb children now use <a> + <svg> to match page's
 *     <Link> + <ChevronRight /> element types
 *   - main column now has 5 children (added rating + comments
 *     skeletons) to match page's structure for PUBLISHED resources
 *   - stats row moved INSIDE the title card to match page layout
 */
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

          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            {/* MAIN COLUMN — MUST have 5 children for PUBLISHED resources
                (matches page.tsx structure: title card + PDF viewer +
                RatingSection + CommentsSection + similar). For ARCHIVED
                or no-body resources, canViewBody is false and only 3
                children render, but this loading skeleton represents the
                full PUBLISHED shape (most common case). */}
            <div>
              {/* Title card (matches page.tsx div with badges, h1, summary,
                  stats INSIDE, and ResourceActions) */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:p-8 mb-4">
                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <div className="h-5 w-20 bg-slate-200 rounded-full animate-pulse" />
                  <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" />
                  <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" />
                  <div className="h-5 w-20 bg-slate-200 rounded-full animate-pulse" />
                </div>
                {/* h1 title */}
                <div className="h-9 w-3/4 bg-slate-200 rounded mb-3 animate-pulse" />
                {/* optional subtitle/description */}
                <div className="h-5 w-1/2 bg-slate-100 rounded mb-4 animate-pulse" />
                {/* Stats row — INSIDE the title card to match page.tsx */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-slate-100">
                  {[
                    { Icon: Eye, label: 'Vues' },
                    { Icon: Download, label: 'Téléch.' },
                    { Icon: Star, label: 'Note' },
                    { Icon: MessageCircle, label: 'Comm.' },
                  ].map(({ Icon, label }, i) => (
                    <div key={i} className="text-center">
                      <Icon className="w-4 h-4 mx-auto mb-1 text-slate-300" />
                      <div className="h-5 w-12 mx-auto bg-slate-200 rounded mb-1 animate-pulse" />
                      <div className="h-3 w-16 mx-auto bg-slate-100 rounded animate-pulse" />
                      <span className="sr-only">{label}</span>
                    </div>
                  ))}
                </div>
                {/* Action buttons (ResourceActions) */}
                <div className="flex gap-2 mt-4">
                  <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse" />
                  <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse" />
                </div>
              </div>

              {/* PDF viewer card (matches page.tsx bg-white rounded-2xl) */}
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4">
                <div className="px-6 lg:px-8 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="h-6 w-40 bg-slate-200 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="p-0">
                  <div className="card p-4 h-[600px] flex items-center justify-center bg-slate-50">
                    <div className="text-center text-slate-400">
                      <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary-400" />
                      <p className="text-sm">Chargement de l'aperçu PDF…</p>
                    </div>
                  </div>
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

            {/* SIDEBAR (must be <aside> to match page) */}
            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
              <div className="card p-5">
                <div className="h-4 w-24 bg-slate-200 rounded mb-4 animate-pulse" />
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-slate-200 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-2/3 bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="card p-5">
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
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
