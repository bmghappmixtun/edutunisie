import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

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
 * The previous version of this file rendered only a sidebar+content grid
 * inside a `<div className="min-h-screen bg-slate-50 pt-20">` — missing
 * flex-col, Header, main, and Footer. When the streamed content replaced
 * the fallback, React's hydration check compared the fallback's structure
 * to the page's structure, found them different, and threw #418/#419/#422.
 *
 * By mirroring the page's outer structure (flex-col wrapper, Header, main
 * with the right padding, Footer) the hydration check passes cleanly.
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 pt-24 lg:pt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page header skeleton */}
          <div className="mb-6 space-y-2">
            <div className="h-9 w-72 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-96 max-w-full bg-slate-100 rounded animate-pulse" />
          </div>

          {/* FilterShell skeleton (sidebar + content) */}
          <div className="grid lg:grid-cols-[340px_1fr] gap-6">
            {/* Sidebar skeleton */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 h-fit space-y-3">
              <div className="h-6 bg-slate-200 rounded w-1/2 mb-4 animate-pulse" />
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-8 bg-slate-100 rounded mb-2 animate-pulse" />
              ))}
            </div>

            {/* Content skeleton */}
            <div className="space-y-4">
              {/* Toolbar skeleton */}
              <div className="h-14 bg-white rounded-xl border border-slate-200 animate-pulse" />
              {/* Grid of cards skeleton */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
                  >
                    <div className="aspect-[4/3] bg-slate-100 animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-1/3 animate-pulse" />
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      <div className="h-3 bg-slate-100 rounded w-2/3 animate-pulse" />
                    </div>
                  </div>
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
