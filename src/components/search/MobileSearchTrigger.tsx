'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ArrowLeft } from 'lucide-react';
import SearchBar from './SearchBar';

export default function MobileSearchTrigger() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      // Auto-focus the search input
      setTimeout(() => {
        const input = document.getElementById('mobile-search-input');
        input?.focus();
      }, 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const overlay = open ? (
    <div className="fixed inset-0 z-[100] md:hidden bg-white" role="dialog" aria-modal="true" aria-label="Recherche">
      {/* Header with back button */}
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 z-10">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="p-2 -ml-2 hover:bg-slate-100 rounded-lg"
          aria-label="Fermer la recherche"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <SearchBar
            size="lg"
            className="w-full"
          />
        </div>
      </div>

      {/* Body — suggestions + popular */}
      <div className="px-4 py-6 text-center text-slate-500 text-sm">
        <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p className="font-semibold mb-1 text-slate-700">Recherche Examanet</p>
        <p>Commence à taper pour voir les résultats, ou choisis un terme populaire ci-dessous.</p>

        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {['Mathématiques', 'Physique', 'SVT', 'Français', 'Arabe', 'Anglais', 'Bac', 'Concours 9ème'].map(term => (
            <a
              key={term}
              href={`/recherche?q=${encodeURIComponent(term)}`}
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-primary-50 hover:text-primary-700 text-slate-700 rounded-full text-xs font-semibold transition"
            >
              {term}
            </a>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
        aria-label="Ouvrir la recherche"
      >
        <Search className="w-5 h-5" />
      </button>

      {mounted && overlay && createPortal(overlay, document.body)}
    </>
  );
}
