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
 * CRITICAL: the loading skeleton must use the SAME element types as the
 * page (e.g. `<h1>` for the title, `<p>` for the subtitle, `<a>` for the
 * resource cards). React's hydration check compares DOM element types
 * against the React tree, so a `<div>` skeleton where the page renders an
 * `<h1>` triggers #418/#422 (mismatch). The previous version had `<div>`
 * skeletons for the title/subtitle — fixed 2026-07-25.
 *
 * The page-level wrappers (`min-h-screen flex flex-col`, Header, main
 * padding, Footer) are mirrored byte-for-byte to keep the Suspense
 * fallback structure identical to the streamed content.
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 pt-24 lg:pt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page header skeleton — element types MUST match page.tsx (h1 + p)
              to avoid React #418/#422 hydration mismatches. */}
          <div className="mb-6">
            <h1 className="h-9 w-72 bg-slate-200 rounded animate-pulse text-[0px] leading-none" />
            <p className="h-4 w-96 max-w-full bg-slate-100 rounded animate-pulse text-[0px] leading-none mt-2" />
          </div>

          {/* FilterShell skeleton (sidebar + content) */}
          <div className="grid lg:grid-cols-[340px_1fr] gap-6">
            {/* Sidebar skeleton */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 h-fit space-y-3">
              <h2 className="h-6 bg-slate-200 rounded w-1/2 mb-4 animate-pulse text-[0px] leading-none" />
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-8 bg-slate-100 rounded mb-2 animate-pulse" />
              ))}
            </div>

            {/* Content skeleton */}
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
