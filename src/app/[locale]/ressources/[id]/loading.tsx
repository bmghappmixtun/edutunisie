import { Loader2, Eye, Download, Star, MessageCircle, FileText, ChevronRight } from 'lucide-react';

// Per-route loading state for /ressources/[id]/[slug]
// Shows a skeleton while the page async data is being fetched.
// MUST mirror the page outer element types/structure to avoid
// React 418/422/419 hydration mismatches.

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* JSON-LD placeholders matching the 2 scripts in the page. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: '{}' }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: '{}' }} />

      <main className="flex-1 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb nav skeleton - 7 children: 4 a + 3 ChevronRight */}
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
        </div>
      </main>
    </div>
  );
}
