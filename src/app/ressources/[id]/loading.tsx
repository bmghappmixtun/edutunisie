import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Loader2, BookOpen, FileText, Star, Eye, Download } from 'lucide-react';

/**
 * Per-route loading state for /ressources/[id]/[slug]
 *
 * Shows a skeleton with the Examanet loading icon while the page's
 * async data (prisma query, auth, ratings) is being fetched.
 *
 * MUST mirror the page's outer element types to avoid React #418/#422
 * hydration mismatches (div wrapping Header + main + Footer, aside for
 * sidebar, h1 for title, script type=application/ld+json placeholders
 * matching the page's 2 JSON-LD scripts).
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* JSON-LD placeholders matching the 2 scripts in the page (course + breadcrumb).
          The page renders them as the FIRST children of the wrapper (before
          <Header />), so the loading must too — placing them inside <main>
          (the previous version) produced a structural mismatch when the
          Suspense fallback was replaced by the streamed content, triggering
          React #418/#422 hydration errors (ERR-3EU598, ERR-..., in the
          2026-07-29 nightly digest on single-resource URLs). */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: '{}' }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: '{}' }} />

      <Header />
      <main className="flex-1 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Loading hero with icon */}
          <div className="text-center py-12">
            <div className="relative inline-flex items-center justify-center mb-6">
              <div className="absolute inset-0 bg-primary-200 rounded-full blur-2xl opacity-50 animate-pulse" />
              <div className="relative flex items-center gap-3">
                <BookOpen className="w-10 h-10 text-sky-500 animate-pulse" />
                <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                <BookOpen className="w-10 h-10 text-purple-500 animate-pulse" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-700 mb-1">Chargement en cours…</h1>
            <p className="text-slate-500">Récupération de la ressource et de son aperçu</p>
          </div>

          {/* Page structure skeleton matching the actual layout */}
          <div className="grid lg:grid-cols-[1fr_360px] gap-6 mt-6">
            {/* MAIN COLUMN */}
            <div className="space-y-6">
              {/* Title + breadcrumb skeleton */}
              <div>
                <div className="h-4 w-48 bg-slate-200 rounded mb-4 animate-pulse" />
                <div className="h-9 w-3/4 bg-slate-200 rounded mb-3 animate-pulse" />
                <div className="h-5 w-1/2 bg-slate-100 rounded animate-pulse" />
              </div>

              {/* Stats row skeleton (matches grid-cols-2 sm:grid-cols-4) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-slate-100">
                {[
                  { Icon: Eye, label: 'Vues' },
                  { Icon: Download, label: 'Téléch.' },
                  { Icon: Star, label: 'Note' },
                  { Icon: FileText, label: 'Pages' },
                ].map(({ Icon, label }, i) => (
                  <div key={i} className="text-center">
                    <Icon className="w-4 h-4 mx-auto mb-1 text-slate-300" />
                    <div className="h-5 w-12 mx-auto bg-slate-200 rounded mb-1 animate-pulse" />
                    <div className="h-3 w-16 mx-auto bg-slate-100 rounded animate-pulse" />
                    <span className="sr-only">{label}</span>
                  </div>
                ))}
              </div>

              {/* PDF viewer placeholder */}
              <div className="card p-4 h-[600px] flex items-center justify-center bg-slate-50">
                <div className="text-center text-slate-400">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary-400" />
                  <p className="text-sm">Chargement de l'aperçu PDF…</p>
                </div>
              </div>

              {/* Similar resources placeholder */}
              <div>
                <h2 className="text-xl font-bold mb-4 text-slate-700">📚 Ressources similaires</h2>
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
      <Footer />
    </div>
  );
}
