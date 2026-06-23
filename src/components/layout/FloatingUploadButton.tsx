'use client';
import Link from 'next/link';
import { Plus, Upload, X } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * Floating Action Button (FAB) for quick resource upload.
 * Visible only inside the teacher space.
 *
 * - Hidden on /enseignant/ajouter itself (the user is already uploading)
 * - Tapping the FAB expands a tooltip showing "Ajouter une ressource"
 * - On mobile: pure icon button (40% smaller)
 */
export default function FloatingUploadButton() {
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Auto-hide on the upload page itself
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/enseignant/ajouter')) {
      setHidden(true);
    }
  }, []);

  if (hidden) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 print:hidden">
      {/* Tooltip on hover/expand */}
      {expanded && (
        <div
          className="bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 cursor-pointer"
          onClick={() => (window.location.href = '/enseignant/ajouter')}
        >
          Ajouter une ressource
        </div>
      )}

      {/* Main FAB */}
      <Link
        href="/enseignant/ajouter"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onFocus={() => setExpanded(true)}
        onBlur={() => setExpanded(false)}
        className="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-2xl hover:shadow-amber-500/50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
        aria-label="Ajouter une ressource"
        title="Ajouter une ressource"
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-20" />

        {/* Icon */}
        <Upload className="w-6 h-6 sm:w-7 sm:h-7 relative z-10" strokeWidth={2.5} />

        {/* Subtle "+" badge in top-right */}
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-orange-600 rounded-full flex items-center justify-center text-xs font-extrabold shadow-md">
          +
        </span>
      </Link>
    </div>
  );
}
