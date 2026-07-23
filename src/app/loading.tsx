import { Loader2, BookOpen } from 'lucide-react';

/**
 * Root loading state — shown during page transitions and initial loads.
 * Used as fallback for any route that doesn't define its own loading.tsx.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 pt-20 flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="absolute inset-0 bg-primary-200 rounded-full blur-2xl opacity-50 animate-pulse" />
          <div className="relative flex items-center gap-3">
            <BookOpen className="w-10 h-10 text-sky-500 animate-pulse" />
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
            <BookOpen className="w-10 h-10 text-purple-500 animate-pulse" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-slate-700 mb-1">
          Chargement en cours…
        </h2>
        <p className="text-sm text-slate-500">
          Préparation de votre page
        </p>
        <div className="mt-5 w-48 h-1 bg-slate-200 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-gradient-to-r from-sky-400 to-primary-500 rounded-full animate-pulse w-1/3" />
        </div>
      </div>
    </div>
  );
}
