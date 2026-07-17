'use client';

import {
  useQueryState,
  useQueryStates,
  parseAsString,
  parseAsArrayOf,
  parseAsInteger,
  parseAsStringEnum,
  parseAsBoolean,
} from 'nuqs';
import {
  useState,
  useEffect,
  useTransition,
  useDeferredValue,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  Search, X, ChevronDown, SlidersHorizontal, Star,
  Check, BookOpen, GraduationCap, Calendar, Languages,
  FileText, CheckCircle2, ArrowUpDown, LayoutGrid, List,
  RotateCcw, Loader2, Sparkles, Filter as FilterIcon,
} from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as Switch from '@radix-ui/react-switch';
import type { LucideIcon } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import ResourceCard from '@/components/resources/ResourceCard';
import ResourceListItem from '@/components/resources/ResourceListItem';

// ============== TYPES ==============
import type { Facets as FacetsType, RessourcesResponse } from '@/lib/facets';

export type { Facets } from '@/lib/facets';

interface FilterShellProps {
  initialData: RessourcesResponse;
  userId: string | null;
  initialFavorites: Set<string>;
}

type ApiResponse = FilterShellProps['initialData'];

// ============== RESOURCE TYPE / TRIMESTRE / LANGUAGE / YEAR META ==============
const TYPE_META: Record<string, { label: string; emoji: string; color: string }> = {
  COURSE:      { label: 'Cours',         emoji: '📘', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  HOMEWORK:    { label: 'Devoir',        emoji: '📝', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  EXERCISE:    { label: 'Exercice',      emoji: '📊', color: 'bg-green-100 text-green-700 border-green-200' },
  REVISION:    { label: 'Révision',      emoji: '🔄', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  EXAM:        { label: 'Examen',        emoji: '📃', color: 'bg-red-100 text-red-700 border-red-200' },
  BAC_SUBJECT: { label: 'Sujet Bac',     emoji: '🎯', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  CORRECTION:  { label: 'Corrigé',       emoji: '✅', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  SUMMARY:     { label: 'Résumé',        emoji: '📋', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  OTHER:       { label: 'Autre',         emoji: '📦', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const TRIMESTRE_META: Record<string, { label: string; emoji: string }> = {
  '1': { label: 'Trimestre 1', emoji: '1️⃣' },
  '2': { label: 'Trimestre 2', emoji: '2️⃣' },
  '3': { label: 'Trimestre 3', emoji: '3️⃣' },
};

const LANGUAGE_META: Record<string, { label: string; flag: string }> = {
  fr: { label: 'Français', flag: '🇫🇷' },
  ar: { label: 'Arabe',    flag: '🇹🇳' },
  en: { label: 'Anglais',  flag: '🇬🇧' },
};

const SORT_META: Record<string, string> = {
  recent: 'Plus récent',
  popular: 'Plus consulté',
  downloads: 'Plus téléchargé',
  rating: 'Mieux noté',
  oldest: 'Plus ancien',
};

// ============== HELPERS ==============
const empty = (s: string | null | undefined) =>
  !s || s === '' || s === '[]';

// ============== MAIN COMPONENT ==============
export default function FilterShell({ initialData, userId, initialFavorites }: FilterShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // ============== URL STATE (single source of truth) ==============
  const [filters, setFilters] = useQueryStates({
    q: parseAsString.withDefault(''),
    type: parseAsArrayOf(parseAsString).withDefault([]),
    class: parseAsArrayOf(parseAsString).withDefault([]),
    section: parseAsArrayOf(parseAsString).withDefault([]),
    subject: parseAsArrayOf(parseAsString).withDefault([]),
    trimestre: parseAsArrayOf(parseAsString).withDefault([]),
    year: parseAsArrayOf(parseAsString).withDefault([]),
    language: parseAsArrayOf(parseAsString).withDefault([]),
    hasCorrection: parseAsBoolean.withDefault(false),
    teacherId: parseAsString.withDefault(''),
    sort: parseAsStringEnum(['recent', 'popular', 'downloads', 'rating', 'oldest']).withDefault('recent'),
    page: parseAsInteger.withDefault(1),
    view: parseAsStringEnum(['grid', 'list']).withDefault('grid'),
  });

  // ============== DATA (server initial → client-refetched) ==============
  const [data, setData] = useState<ApiResponse>(initialData);
  const [favorites] = useState<Set<string>>(initialFavorites);
  const [isFetching, setIsFetching] = useState(false);
  const lastFetchKey = useRef<string>('');

  // Compute a stable key for current filters (used to dedupe fetches)
  const filterKey = useMemo(() => JSON.stringify({
    q: filters.q,
    type: [...filters.type].sort(),
    class: [...filters.class].sort(),
    section: [...filters.section].sort(),
    subject: [...filters.subject].sort(),
    trimestre: [...filters.trimestre].sort(),
    year: [...filters.year].sort(),
    language: [...filters.language].sort(),
    hasCorrection: filters.hasCorrection,
    teacherId: filters.teacherId,
    sort: filters.sort,
    page: filters.page,
  }), [filters]);

  // Compute the key the initial SSR data was loaded with so we can
  // skip the first client refetch when filters haven't actually changed.
  // Prevents "resources appear, then disappear" race on first paint.
  // `filters` at first render matches the URL → matches the SSR data.
  // So if the current filterKey === first render filterKey, we can trust
  // initialData and skip the refetch.
  const isFirstRender = useRef(true);
  const firstRenderKey = useRef('');
  if (isFirstRender.current && !firstRenderKey.current) {
    firstRenderKey.current = filterKey;
  }

  // ============== FETCH ON FILTER CHANGE (debounced) ==============
  useEffect(() => {
    // Skip the initial fetch on first render if the SSR data already
    // matches the current filter key (prevents the brief "resources
    // appear then disappear" race when the page first hydrates).
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (filterKey === firstRenderKey.current) {
        lastFetchKey.current = filterKey;  // mark as "already fetched" (with SSR data)
        return;
      }
    }

    if (lastFetchKey.current === filterKey) return;
    lastFetchKey.current = filterKey;

    const controller = new AbortController();
    const t = setTimeout(async () => {
      setIsFetching(true);
      try {
        const params = new URLSearchParams();
        if (filters.q) params.set('q', filters.q);
        filters.type.forEach((v) => params.append('type', v));
        filters.class.forEach((v) => params.append('class', v));
        filters.section.forEach((v) => params.append('section', v));
        filters.subject.forEach((v) => params.append('subject', v));
        filters.trimestre.forEach((v) => params.append('trimestre', v));
        filters.year.forEach((v) => params.append('year', v));
        filters.language.forEach((v) => params.append('language', v));
        if (filters.hasCorrection) params.set('hasCorrection', '1');
        if (filters.teacherId) params.set('teacherId', filters.teacherId);
        params.set('sort', filters.sort);
        params.set('page', String(filters.page));

        const res = await fetch(`/api/ressources?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ApiResponse = await res.json();
        setData(json);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('[FilterShell] fetch error:', err);
      } finally {
        setIsFetching(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [filterKey, filters]);

  // ============== MUTATIONS ==============
  const update = useCallback(
    (patch: Record<string, unknown>) => {
      // Any filter change resets page to 1
      const next: Record<string, unknown> = { ...patch };
      if (!('page' in patch)) next.page = 1;
      startTransition(() => {
        void setFilters(next as any);
      });
    },
    [setFilters]
  );

  const reset = useCallback(() => {
    startTransition(() => {
      void setFilters({
        q: '',
        type: [],
        class: [],
        section: [],
        subject: [],
        trimestre: [],
        year: [],
        language: [],
        hasCorrection: false,
        teacherId: '',
        sort: 'recent',
        page: 1,
        view: filters.view,
      } as any);
    });
  }, [setFilters, filters.view]);

  const toggleMulti = (key: 'type' | 'class' | 'section' | 'subject' | 'trimestre' | 'year' | 'language', value: string) => {
    const current = filters[key];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    update({ [key]: next });
  };

  const activeCount =
    (filters.q ? 1 : 0) +
    filters.type.length +
    filters.class.length +
    filters.section.length +
    filters.subject.length +
    filters.trimestre.length +
    filters.year.length +
    filters.language.length +
    (filters.hasCorrection ? 1 : 0);

  // ============== FACET OPTIONS (only those with count > 0) ==============
  const yearOptions = useMemo(
    () => Object.entries(data.facets.byYear).sort(([a], [b]) => b.localeCompare(a)),
    [data.facets.byYear]
  );
  const subjectOptions = useMemo(
    () => Object.entries(data.facets.bySubject).sort(([, a], [, b]) => b - a),
    [data.facets.bySubject]
  );
  const classOptions = useMemo(
    () => Object.entries(data.facets.byClass).sort(([, a], [, b]) => b - a),
    [data.facets.byClass]
  );
  const sectionOptions = useMemo(
    () => Object.entries(data.facets.bySection).sort(([, a], [, b]) => b - a),
    [data.facets.bySection]
  );

  // Filter sections to only those matching selected classes
  const availableSections = useMemo(() => {
    if (filters.class.length === 0) return sectionOptions;
    // We need class->sections mapping. For now just show all sections;
    // the server's facet count already respects class filter.
    return sectionOptions;
  }, [sectionOptions, filters.class]);

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-6">
      {/* ============== SIDEBAR FILTERS ============== */}
      <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm h-fit lg:sticky lg:top-24 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-sm flex items-center gap-2 text-slate-900">
            <SlidersHorizontal className="w-4 h-4 text-primary-600" />
            Filtres
            {activeCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-600 text-white text-[10px] font-bold">
                {activeCount}
              </span>
            )}
          </h3>
          {activeCount > 0 && (
            <button
              onClick={reset}
              className="text-xs text-slate-500 hover:text-red-600 font-semibold flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        <div className="max-h-[calc(100vh-180px)] overflow-y-auto px-5 py-4 space-y-5">
          {/* ----- RECHERCHE ----- */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Recherche
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={filters.q}
                onChange={(e) => update({ q: e.target.value })}
                placeholder="Mots-clés..."
                className="w-full pl-9 pr-9 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-400 focus:bg-white outline-none transition"
              />
              {filters.q && (
                <button
                  onClick={() => update({ q: '' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  aria-label="Effacer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ----- TYPE ----- */}
          {Object.keys(data.facets.byType).length > 0 && (
            <MultiSelectChips
              label="Type de ressource"
              icon={FileText}
              options={Object.entries(data.facets.byType)
                .sort(([, a], [, b]) => b - a)
                .map(([value, count]) => ({
                  value,
                  label: TYPE_META[value]?.label || value,
                  emoji: TYPE_META[value]?.emoji,
                  color: TYPE_META[value]?.color,
                  count,
                }))}
              selected={filters.type}
              onToggle={(v) => toggleMulti('type', v)}
            />
          )}

          {/* ----- MATIÈRE ----- */}
          {subjectOptions.length > 0 && (
            <MultiSelectChips
              label="Matière"
              icon={BookOpen}
              options={subjectOptions.map(([slug, count]) => ({
                value: slug,
                label: initialData.nameMaps?.subject?.[slug] || slug,
                count,
              }))}
              selected={filters.subject}
              onToggle={(v) => toggleMulti('subject', v)}
            />
          )}

          {/* ----- CLASSE ----- */}
          {classOptions.length > 0 && (
            <MultiSelectChips
              label="Classe"
              icon={GraduationCap}
              options={classOptions.map(([slug, count]) => ({
                value: slug,
                label: initialData.nameMaps?.class?.[slug] || slug,
                count,
              }))}
              selected={filters.class}
              onToggle={(v) => toggleMulti('class', v)}
            />
          )}

          {/* ----- SECTION (only if classes selected OR sections exist) ----- */}
          {availableSections.length > 0 && (
            <MultiSelectChips
              label="Section"
              icon={FilterIcon}
              options={availableSections.map(([slug, count]) => ({
                value: slug,
                label: initialData.nameMaps?.section?.[slug] || slug,
                count,
              }))}
              selected={filters.section}
              onToggle={(v) => toggleMulti('section', v)}
            />
          )}

          {/* ----- ANNÉE SCOLAIRE ----- */}
          {yearOptions.length > 0 && (
            <MultiSelectChips
              label="Année scolaire"
              icon={Calendar}
              options={yearOptions.map(([year, count]) => ({
                value: year,
                label: year,
                count,
              }))}
              selected={filters.year}
              onToggle={(v) => toggleMulti('year', v)}
            />
          )}

          {/* ----- TRIMESTRE ----- */}
          {Object.keys(data.facets.byTrimestre).length > 0 && (
            <MultiSelectChips
              label="Trimestre"
              icon={Sparkles}
              options={Object.entries(data.facets.byTrimestre)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([value, count]) => ({
                  value,
                  label: TRIMESTRE_META[value]?.label || `Trim. ${value}`,
                  emoji: TRIMESTRE_META[value]?.emoji,
                  count,
                }))}
              selected={filters.trimestre}
              onToggle={(v) => toggleMulti('trimestre', v)}
            />
          )}

          {/* ----- LANGUE ----- */}
          {Object.keys(data.facets.byLanguage).length > 1 && (
            <MultiSelectChips
              label="Langue"
              icon={Languages}
              options={Object.entries(data.facets.byLanguage)
                .sort(([, a], [, b]) => b - a)
                .map(([value, count]) => ({
                  value,
                  label: LANGUAGE_META[value]?.label || value.toUpperCase(),
                  emoji: LANGUAGE_META[value]?.flag,
                  count,
                }))}
              selected={filters.language}
              onToggle={(v) => toggleMulti('language', v)}
            />
          )}

          {/* ----- AVEC CORRIGÉ ----- */}
          {data.facets.withCorrection > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Options
              </label>
              <button
                onClick={() => update({ hasCorrection: !filters.hasCorrection })}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition ${
                  filters.hasCorrection
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Avec corrigé seulement
                </span>
                <Switch.Root
                  checked={filters.hasCorrection}
                  onCheckedChange={(c) => update({ hasCorrection: c })}
                  className={`w-9 h-5 rounded-full relative transition ${
                    filters.hasCorrection ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <Switch.Thumb className="block w-4 h-4 bg-white rounded-full shadow transition-transform translate-x-0.5 data-[state=checked]:translate-x-[18px]" />
                </Switch.Root>
              </button>
              <div className="text-[11px] text-slate-500 mt-1.5 ml-1">
                {data.facets.withCorrection.toLocaleString('fr-FR')} ressources avec corrigé
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ============== MAIN ============== */}
      <div>
        {/* ----- Toolbar ----- */}
        <div className="flex items-center justify-between mb-4 bg-white rounded-xl border border-slate-200 px-4 py-3 gap-2 flex-wrap">
          <div className="text-sm flex items-center gap-2">
            {isFetching ? (
              <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-primary-500" />
            )}
            <span>
              <strong className="font-bold text-slate-900">
                {data.total.toLocaleString('fr-FR')}
              </strong>{' '}
              <span className="text-slate-500">
                ressource{data.total > 1 ? 's' : ''}
              </span>
              {data.total > 0 && data.totalPages > 1 && (
                <span className="text-slate-400 ml-1">
                  · page {data.currentPage}/{data.totalPages}
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <ToggleGroup.Root
              type="single"
              value={filters.view}
              onValueChange={(v) => v && update({ view: v as 'grid' | 'list' })}
              className="inline-flex items-center bg-slate-100 rounded-lg p-0.5"
            >
              <ToggleGroup.Item
                value="grid"
                aria-label="Grille"
                className="p-1.5 rounded-md data-[state=on]:bg-white data-[state=on]:shadow-sm transition"
              >
                <LayoutGrid className="w-4 h-4" />
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="list"
                aria-label="Liste"
                className="p-1.5 rounded-md data-[state=on]:bg-white data-[state=on]:shadow-sm transition"
              >
                <List className="w-4 h-4" />
              </ToggleGroup.Item>
            </ToggleGroup.Root>

            {/* Sort */}
            <Popover.Root>
              <Popover.Trigger asChild>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{SORT_META[filters.sort]}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  align="end"
                  sideOffset={6}
                  className="z-50 min-w-[180px] bg-white border border-slate-200 rounded-xl shadow-xl p-1"
                >
                  {Object.entries(SORT_META).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => {
                        update({ sort: value as any });
                        document.body.click();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition ${
                        filters.sort === value
                          ? 'bg-primary-50 text-primary-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {label}
                      {filters.sort === value && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>

        {/* ----- Active filter chips ----- */}
        {activeCount > 0 && (
          <ActiveFilterChips
            filters={filters}
            onRemove={(patch) => update(patch)}
            onReset={reset}
            nameMaps={initialData.nameMaps}
          />
        )}

        {/* ----- Results ----- */}
        {data.resources.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="text-6xl mb-3">🔍</div>
            <h3 className="font-bold text-xl mb-2">Aucun résultat</h3>
            <p className="text-slate-500 mb-5 text-sm">
              Essayez d'élargir vos critères ou supprimez quelques filtres.
            </p>
            <button onClick={reset} className="btn-primary inline-flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Réinitialiser tous les filtres
            </button>
          </div>
        ) : (
          <div
            className={
              filters.view === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5'
                : 'space-y-2'
            }
          >
            {data.resources.map((r) =>
              filters.view === 'list' ? (
                <ResourceListItem key={r.id} resource={{ ...r, isFavorited: favorites.has(r.id) }} />
              ) : (
                <ResourceCard key={r.id} resource={{ ...r, isFavorited: favorites.has(r.id) } as any} />
              )
            )}
          </div>
        )}

        {/* ----- Pagination ----- */}
        {data.totalPages > 1 && (
          <Pagination
            current={data.currentPage}
            total={data.totalPages}
            onChange={(p) => update({ page: p })}
          />
        )}
      </div>
    </div>
  );
}

// ============== MULTI-SELECT CHIPS ==============
function MultiSelectChips({
  label,
  icon: Icon,
  options,
  selected,
  onToggle,
}: {
  label: string;
  icon: LucideIcon;
  options: { value: string; label: string; emoji?: string; color?: string; count: number }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  // Show top 6 inline, with a "voir plus" popover
  const topInline = options.slice(0, 6);
  const remaining = Math.max(0, options.length - 6);

  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
        <span className="text-slate-400 font-normal normal-case ml-auto">
          ({options.length})
        </span>
      </label>

      <div className="flex flex-wrap gap-1.5">
        {topInline.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => onToggle(opt.value)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
              }`}
            >
              {opt.emoji && <span className="text-[11px]">{opt.emoji}</span>}
              <span className="truncate max-w-[120px]">{opt.label}</span>
              <span
                className={`tabular-nums text-[10px] ${
                  isSelected ? 'opacity-70' : 'text-slate-400'
                }`}
              >
                {opt.count}
              </span>
            </button>
          );
        })}

        {remaining > 0 && (
          <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
              <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition">
                +{remaining} autres
                <ChevronDown className="w-3 h-3" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="start"
                sideOffset={4}
                className="z-50 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-3"
              >
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-2 focus:ring-2 focus:ring-primary-200 focus:border-primary-400 outline-none"
                />
                <div className="max-h-72 overflow-y-auto space-y-0.5">
                  {filtered.map((opt) => {
                    const isSelected = selected.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => onToggle(opt.value)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-left transition ${
                          isSelected
                            ? 'bg-slate-900 text-white'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {opt.emoji && <span>{opt.emoji}</span>}
                        <span className="flex-1 truncate">{opt.label}</span>
                        <span className={`text-xs tabular-nums ${isSelected ? 'opacity-70' : 'text-slate-400'}`}>
                          {opt.count}
                        </span>
                      </button>
                    );
                  })}
                  {filtered.length === 0 && (
                    <p className="text-center text-sm text-slate-400 py-4">Aucun résultat</p>
                  )}
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}
      </div>
    </div>
  );
}

// ============== ACTIVE FILTER CHIPS ==============
function ActiveFilterChips({
  filters,
  onRemove,
  onReset,
  nameMaps,
}: {
  filters: any;
  onRemove: (patch: any) => void;
  onReset: () => void;
  nameMaps?: { class?: Record<string, string>; section?: Record<string, string>; subject?: Record<string, string> };
}) {
  const chips: { key: string; label: string; onRemove: () => void; color: string }[] = [];

  if (filters.q) {
    chips.push({
      key: 'q',
      label: `« ${filters.q} »`,
      onRemove: () => onRemove({ q: '' }),
      color: 'bg-slate-900 text-white',
    });
  }
  filters.type.forEach((v: string) => {
    chips.push({
      key: `type-${v}`,
      label: TYPE_META[v]?.label || v,
      onRemove: () => onRemove({ type: filters.type.filter((x: string) => x !== v) }),
      color: TYPE_META[v]?.color || 'bg-slate-100 text-slate-700',
    });
  });
  filters.subject.forEach((v: string) => {
    chips.push({
      key: `subject-${v}`,
      label: nameMaps?.subject?.[v] || v,
      onRemove: () => onRemove({ subject: filters.subject.filter((x: string) => x !== v) }),
      color: 'bg-violet-100 text-violet-700',
    });
  });
  filters.class.forEach((v: string) => {
    chips.push({
      key: `class-${v}`,
      label: nameMaps?.class?.[v] || v,
      onRemove: () => onRemove({ class: filters.class.filter((x: string) => x !== v) }),
      color: 'bg-indigo-100 text-indigo-700',
    });
  });
  filters.section.forEach((v: string) => {
    chips.push({
      key: `section-${v}`,
      label: nameMaps?.section?.[v] || v,
      onRemove: () => onRemove({ section: filters.section.filter((x: string) => x !== v) }),
      color: 'bg-cyan-100 text-cyan-700',
    });
  });
  filters.year.forEach((v: string) => {
    chips.push({
      key: `year-${v}`,
      label: v,
      onRemove: () => onRemove({ year: filters.year.filter((x: string) => x !== v) }),
      color: 'bg-orange-100 text-orange-700',
    });
  });
  filters.trimestre.forEach((v: string) => {
    chips.push({
      key: `trimestre-${v}`,
      label: TRIMESTRE_META[v]?.label || `Trim. ${v}`,
      onRemove: () => onRemove({ trimestre: filters.trimestre.filter((x: string) => x !== v) }),
      color: 'bg-purple-100 text-purple-700',
    });
  });
  filters.language.forEach((v: string) => {
    chips.push({
      key: `language-${v}`,
      label: `${LANGUAGE_META[v]?.flag || ''} ${LANGUAGE_META[v]?.label || v}`.trim(),
      onRemove: () => onRemove({ language: filters.language.filter((x: string) => x !== v) }),
      color: 'bg-teal-100 text-teal-700',
    });
  });
  if (filters.hasCorrection) {
    chips.push({
      key: 'correction',
      label: 'Avec corrigé',
      onRemove: () => onRemove({ hasCorrection: false }),
      color: 'bg-emerald-100 text-emerald-700',
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {chips.map((c) => (
        <span
          key={c.key}
          className={`inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full text-xs font-semibold ${c.color}`}
        >
          {c.label}
          <button
            onClick={c.onRemove}
            className="p-0.5 rounded-full hover:bg-black/10 transition"
            aria-label="Retirer le filtre"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button
        onClick={onReset}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-red-600 hover:bg-red-50 transition"
      >
        Tout effacer
      </button>
    </div>
  );
}

// ============== PAGINATION ==============
function Pagination({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (page: number) => void;
}) {
  // Build visible page numbers with ellipsis
  const pages: (number | '...')[] = [];
  const add = (p: number | '...') => pages.push(p);

  // Always show: 1, current-1, current, current+1, last
  // Add ellipsis where there are gaps
  const set = new Set<number>([1, total, current, current - 1, current + 1]);
  for (let i = 1; i <= total; i++) {
    if (set.has(i)) {
      // Add ellipsis before if needed
      if (pages.length > 0 && typeof pages[pages.length - 1] === 'number' && i - (pages[pages.length - 1] as number) > 1) {
        add('...');
      }
      add(i);
    }
  }

  return (
    <nav className="flex items-center justify-center gap-1 mt-8 flex-wrap" aria-label="Pagination">
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className="px-3 py-2 rounded-lg text-sm font-semibold bg-white border border-slate-200 hover:border-primary-300 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        ← Précédent
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="px-2 text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`min-w-[40px] h-10 px-3 rounded-lg text-sm font-semibold transition ${
              p === current
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 hover:border-primary-300 hover:text-primary-600'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        className="px-3 py-2 rounded-lg text-sm font-semibold bg-white border border-slate-200 hover:border-primary-300 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        Suivant →
      </button>
    </nav>
  );
}
