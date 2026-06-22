'use client';
import { useState, useEffect } from 'react';
import { Grid3x3, List } from 'lucide-react';

export type ViewMode = 'grid' | 'list';

export function useViewMode(): [ViewMode, (m: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>('grid');
  useEffect(() => {
    const stored = localStorage.getItem('resources-view') as ViewMode | null;
    if (stored === 'grid' || stored === 'list') setMode(stored);
  }, []);
  const update = (m: ViewMode) => {
    setMode(m);
    localStorage.setItem('resources-view', m);
  };
  return [mode, update];
}

export default function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
          mode === 'grid' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
        aria-label="Vue miniatures"
        title="Vue miniatures"
      >
        <Grid3x3 className="w-3.5 h-3.5" /> Miniatures
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
          mode === 'list' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
        aria-label="Vue liste"
        title="Vue liste"
      >
        <List className="w-3.5 h-3.5" /> Liste
      </button>
    </div>
  );
}
