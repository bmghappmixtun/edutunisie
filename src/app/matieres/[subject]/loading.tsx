import { Loader2, BookOpen, FileText, GraduationCap } from 'lucide-react';

/**
 * Loading state for /matieres/[subject]
 * Shown during initial page load + ISR revalidation.
 *
 * Why: /matieres/physique is heavy (3,157 resources, 7 parallel facets).
 * Without this, users see a frozen screen until the server responds,
 * or worse — a 500 error if Vercel times out during cold start.
 *
 * Design: animated 3-icon row + skeleton grid for resources.
 */
export default function SubjectLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <main className="flex-1 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-200 to-sky-100 animate-pulse" />
              <div>
                <div className="h-7 w-48 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-72 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Filter chips skeleton */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-9 w-24 bg-slate-200 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>

          {/* Main content: animated loader + skeleton grid */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
            <div className="flex flex-col items-center justify-center text-center py-8">
              {/* Animated 3-icon row */}
              <div className="flex items-center gap-4 mb-5">
                <BookOpen
                  className="w-10 h-10 text-sky-500 animate-pulse"
                  style={{ animationDuration: '1.2s' }}
                />
                <div className="relative">
                  <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                </div>
                <FileText
                  className="w-10 h-10 text-emerald-500 animate-pulse"
                  style={{ animationDuration: '1.4s', animationDelay: '0.2s' }}
                />
                <GraduationCap
                  className="w-10 h-10 text-purple-500 animate-pulse"
                  style={{ animationDuration: '1.6s', animationDelay: '0.4s' }}
                />
              </div>

              <h2 className="text-lg font-semibold text-slate-700 mb-1">
                Chargement des ressources…
              </h2>
              <p className="text-sm text-slate-500 max-w-md">
                Préparation des devoirs, exercices et cours. Cela peut prendre
                quelques secondes lors de la première visite.
              </p>

              {/* Progress bar (indeterminate) */}
              <div className="mt-6 w-64 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 via-primary-500 to-purple-500 rounded-full"
                  style={{
                    width: '40%',
                    animation: 'slide 1.8s ease-in-out infinite',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Resource grid skeleton (12 cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse"
                style={{ animationDelay: `${(i % 4) * 100}ms` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-lg" />
                  <div className="h-3 w-16 bg-slate-200 rounded" />
                </div>
                <div className="h-4 w-full bg-slate-200 rounded mb-2" />
                <div className="h-3 w-3/4 bg-slate-200 rounded mb-3" />
                <div className="flex gap-1.5">
                  <div className="h-5 w-12 bg-slate-200 rounded" />
                  <div className="h-5 w-16 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* CSS keyframes for the progress bar */}
      <style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); width: 30%; }
          50% { width: 60%; }
          100% { transform: translateX(250%); width: 30%; }
        }
      `}</style>
    </div>
  );
}
