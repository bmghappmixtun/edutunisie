import { Loader2, BookOpen } from 'lucide-react';

/**
 * Per-locale loading state. Shown while the [locale] layout's
 * server components (Header, Footer) and page content are streaming
 * to the client. Without this explicit boundary, the layout
 * components can race with page rendering and the topmost Suspense
 * boundary (B:0) ends up holding the page back on Cloudflare Workers
 * + OpenNext, which is the root cause of the "Chargement en cours…"
 * infinite loader we saw on /fr and /ar before.
 *
 * Reusing the same visual as the root loading.tsx keeps the UX
 * consistent across initial load and in-app navigations.
 */
export default function LocaleLoading() {
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
