'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, X, Clock, TrendingUp, ArrowRight, Users, BookOpen, GraduationCap, FileText, FolderOpen, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import toast from 'react-hot-toast';

type SuggestResult = {
  type: 'resource' | 'teacher' | 'subject' | 'class' | 'section';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  icon?: string;
};

type GroupedResults = {
  resource: SuggestResult[];
  teacher: SuggestResult[];
  subject: SuggestResult[];
  class: SuggestResult[];
  section: SuggestResult[];
};

const RECENT_KEY = 'edutunisie_recent_searches';
const MAX_RECENT = 5;

const ICON_MAP: Record<string, any> = {
  resource: FileText,
  teacher: Users,
  subject: BookOpen,
  class: GraduationCap,
  section: FolderOpen
};

const LABEL_MAP: Record<string, string> = {
  resource: 'Ressources',
  teacher: 'Professeurs',
  subject: 'Matières',
  class: 'Classes',
  section: 'Sections'
};

const COLOR_MAP: Record<string, string> = {
  resource: 'text-primary-600 bg-primary-50',
  teacher: 'text-amber-600 bg-amber-50',
  subject: 'text-emerald-600 bg-emerald-50',
  class: 'text-purple-600 bg-purple-50',
  section: 'text-pink-600 bg-pink-50'
};

const TRENDING = [
  'Devoir de synthèse',
  'Bac 2024',
  'Mathématiques',
  'Physique',
  'Sciences',
  'Français'
];

export default function SearchBar({ className = '', size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GroupedResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) setRecent(JSON.parse(stored));
    } catch {}
  }, []);

  // Save recent search
  const saveRecent = useCallback((q: string) => {
    if (!q.trim()) return;
    setRecent(prev => {
      const updated = [q, ...prev.filter(x => x !== q)].slice(0, MAX_RECENT);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }

    // Cancel previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}&limit=5`, {
        signal: controller.signal
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.groups);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Suggest error:', e);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(query);
      setActiveIndex(-1);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  // Click outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Handle keyboard
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, totalResults - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleEnter();
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const totalResults = results
    ? Object.values(results).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  const flatResults: SuggestResult[] = results
    ? [...results.resource, ...results.teacher, ...results.subject, ...results.class, ...results.section]
    : [];

  const handleEnter = () => {
    // If a result is active, navigate to it
    if (activeIndex >= 0 && flatResults[activeIndex]) {
      const r = flatResults[activeIndex];
      saveRecent(query);
      router.push(r.href);
      setOpen(false);
      return;
    }
    // Otherwise submit the search
    if (query.trim()) {
      saveRecent(query);
      router.push(`/recherche?q=${encodeURIComponent(query)}`);
      setOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleEnter();
  };

  const selectResult = (r: SuggestResult) => {
    saveRecent(query);
    router.push(r.href);
    setOpen(false);
  };

  const sizeClasses = {
    sm: 'h-10 text-sm',
    md: 'h-12 text-base',
    lg: 'h-14 text-lg'
  }[size];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={t('common.search') + '...'}
            autoComplete="off"
            spellCheck={false}
            className={`w-full ${sizeClasses} pl-10 pr-10 rounded-xl border border-slate-200 bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-100 outline-none transition`}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
          )}
          {!loading && query && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded"
              aria-label="Effacer"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
          style={{ minWidth: '480px' }}
        >
          {!query && (
            <>
              {/* Recent searches */}
              {recent.length > 0 && (
                <div className="p-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">
                    <Clock className="w-3 h-3" />
                    Recherches récentes
                  </div>
                  <div className="space-y-1">
                    {recent.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setQuery(q); setOpen(true); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg text-left text-sm"
                      >
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="flex-1 truncate">{q}</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending */}
              <div className="p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">
                  <TrendingUp className="w-3 h-3" />
                  Tendances
                </div>
                <div className="flex flex-wrap gap-2">
                  {TRENDING.map(t => (
                    <button
                      key={t}
                      onClick={() => { setQuery(t); setOpen(true); }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-semibold text-slate-700 transition"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {query && query.length < 2 && (
            <div className="p-6 text-center text-sm text-slate-500">
              Tapez au moins 2 caractères...
            </div>
          )}

          {query && query.length >= 2 && !loading && totalResults === 0 && (
            <div className="p-6 text-center">
              <div className="text-slate-400 text-sm mb-2">Aucun résultat pour "{query}"</div>
              <button
                onClick={() => { saveRecent(query); router.push(`/recherche?q=${encodeURIComponent(query)}`); setOpen(false); }}
                className="text-sm text-primary-600 hover:underline font-semibold"
              >
                Voir tous les résultats de recherche →
              </button>
            </div>
          )}

          {query && query.length >= 2 && results && totalResults > 0 && (
            <div className="py-2">
              {/* Results grouped by type */}
              {(['resource', 'teacher', 'subject', 'class', 'section'] as const).map(type => {
                const items = results[type];
                if (items.length === 0) return null;
                const Icon = ICON_MAP[type];
                return (
                  <div key={type} className="mb-2 last:mb-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-1.5">
                      <Icon className="w-3 h-3" />
                      {LABEL_MAP[type]} ({items.length})
                    </div>
                    {items.map((r, i) => {
                      const globalIndex = flatResults.indexOf(r);
                      const isActive = globalIndex === activeIndex;
                      return (
                        <button
                          key={r.id}
                          onClick={() => selectResult(r)}
                          onMouseEnter={() => setActiveIndex(globalIndex)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                            isActive ? 'bg-primary-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg ${COLOR_MAP[type]} flex items-center justify-center text-lg flex-shrink-0`}>
                            {r.icon || '📄'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-slate-900 truncate">
                              {r.title}
                            </div>
                            {r.subtitle && (
                              <div className="text-xs text-slate-500 truncate">{r.subtitle}</div>
                            )}
                          </div>
                          <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-slate-300'}`} />
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {/* "View all" button */}
              <div className="border-t border-slate-100 p-2">
                <button
                  onClick={() => { saveRecent(query); router.push(`/recherche?q=${encodeURIComponent(query)}`); setOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-primary-50 hover:text-primary-700 rounded-lg text-sm font-semibold text-slate-700 transition"
                >
                  <Search className="w-4 h-4" />
                  Voir tous les résultats pour "{query}"
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}