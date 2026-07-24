import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

/**
 * Per-route loading state for /professeurs/[numericId]/[slug]
 *
 * WHY THIS FILE EXISTS (fixes React #418/#419/#422 hydration mismatch):
 *
 * The root loading.tsx renders a minimal spinner centered on the screen.
 * When the teacher profile page is rendered, Next.js streams the page
 * (because of `await params` + several async DB queries), and the initial
 * HTML response shows the root loading.tsx as the Suspense fallback.
 *
 * Once the page is ready, the streamed content is moved into the Suspense
 * boundary. But the root loading.tsx structure (a single centered spinner
 * inside a min-h-screen div) does NOT match the page's structure (a
 * `<div className="min-h-screen flex flex-col">` wrapping Header + main +
 * Footer), so React's hydration check fails with #418/#419/#422.
 *
 * By providing a per-route loading.tsx that mirrors the page's outer
 * structure (Header + main skeleton + Footer inside the same flex-col
 * wrapper), the structure stays consistent between fallback and streamed
 * content, and React can hydrate cleanly.
 *
 * This is the same pattern as the per-route not-found.tsx added on
 * 2026-07-20 (commit 17d9586), which fixed the notFound() streaming case.
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        {/* Breadcrumb skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex items-center gap-1 text-xs text-slate-500 flex-wrap">
            <div className="h-3 w-12 bg-slate-200 rounded animate-pulse" />
            <span className="text-slate-300">›</span>
            <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
            <span className="text-slate-300">›</span>
            <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>

        {/* Hero header skeleton */}
        <div className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 overflow-hidden">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Avatar skeleton */}
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-slate-200 animate-pulse flex-shrink-0" />

              <div className="flex-1 min-w-0 w-full space-y-3">
                {/* Name skeleton */}
                <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
                {/* Meta skeleton */}
                <div className="flex flex-wrap gap-2 mt-2">
                  <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" />
                  <div className="h-6 w-16 bg-slate-200 rounded-full animate-pulse" />
                  <div className="h-6 w-24 bg-slate-200 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar skeleton */}
        <div className="bg-white border-y border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 animate-pulse flex-shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-5 w-12 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main column: resources skeleton */}
            <div className="lg:col-span-2 space-y-3">
              <div className="h-6 w-48 bg-slate-200 rounded animate-pulse mb-6" />
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="block bg-white rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-14 rounded-lg bg-slate-200 animate-pulse flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                      <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar skeleton */}
            <aside className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-slate-100 rounded animate-pulse" />
                <div className="h-9 w-full bg-slate-200 rounded-xl animate-pulse" />
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                    <div className="h-2 bg-slate-100 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
