'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Filter, X, ChevronDown, Grid, List, Loader2, Eye, Download, Star, Calendar, User, BookOpen, ChevronRight, ChevronLeft, CheckCircle2, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useI18n } from '@/lib/i18n';
import { formatNumber, timeAgo, HOMEWORK_SUBTYPE_LABELS } from '@/lib/utils';
import { isArabic } from '@/lib/text-utils';

type Resource = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: string;
  year: number | null;
  pageCount: number | null;
  fileSize: number;
  viewsCount: number;
  downloadsCount: number;
  averageRating: number;
  publishedAt: string | null;
  // Homework & school metadata (NEW)
  homeworkSubtype?: string | null;
  homeworkNumber?: number | null;
  schoolType?: string | null;
  product?: string | null;
  hasCorrection?: boolean;
  correctionSummary?: string | null;
  subject: { nameFr: string; slug: string; color?: string; icon?: string };
  class: { nameFr: string; slug: string } | null;
  section: { nameFr: string; slug: string } | null;
  teacher: { firstName: string; lastName: string; avatarUrl?: string | null; schoolName?: string | null };
};

const TYPE_LABELS: Record<string, string> = {
  COURSE: 'Cours',
  HOMEWORK: 'Devoir',
  EXERCISE: 'Exercice',
  SERIES: 'Série',
  BAC_SUBJECT: 'Sujet Bac',
  CORRECTION: 'Corrigé',
  SUMMARY: 'Résumé',
  CARD: 'Fiche'
};

const TYPE_ICONS: Record<string, string> = {
  COURSE: '📖',
  HOMEWORK: '📝',
  EXERCISE: '✏️',
  SERIES: '📚',
  BAC_SUBJECT: '🎓',
  CORRECTION: '✅',
  SUMMARY: '📄',
  CARD: '🗂️'
};

const TYPE_COLORS: Record<string, string> = {
  COURSE: 'bg-blue-100 text-blue-700',
  HOMEWORK: 'bg-amber-100 text-amber-700',
  EXERCISE: 'bg-purple-100 text-purple-700',
  SERIES: 'bg-emerald-100 text-emerald-700',
  BAC_SUBJECT: 'bg-red-100 text-red-700',
  CORRECTION: 'bg-green-100 text-green-700',
  SUMMARY: 'bg-slate-100 text-slate-700',
  CARD: 'bg-pink-100 text-pink-700'
};

export default function SearchResults({ initialData, initialFacets, initialOptions }: any) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();

  const [data, setData] = useState<any>(initialData);
  const [facets, setFacets] = useState<any>(initialFacets);
  const [options, setOptions] = useState<any>(initialOptions);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refetch on URL change
  const searchString = searchParams.toString();
  useEffect(() => {
    // Skip first render (initialData already loaded server-side)
    if (searchString === (initialData?._searchString ?? '')) return;
    
    setIsRefreshing(true);
    const controller = new AbortController();
    
    fetch(`/api/search/resources?${searchString}`, { signal: controller.signal })
      .then(r => r.json())
      .then(result => {
        if (result.success) {
          setData(result.data);
          setFacets(result.facets);
          setOptions(result.options);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('Search refetch failed:', err);
          toast.error('Erreur de recherche');
        }
      })
      .finally(() => setIsRefreshing(false));
    
    return () => controller.abort();
  }, [searchString, initialData?._searchString]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Current filter state (from URL)
  const currentQ = searchParams.get('q') || '';
  const currentSubject = searchParams.get('subject') || '';
  const currentClass = searchParams.get('class') || '';
  const currentTeacher = searchParams.get('teacher') || '';
  const currentType = searchParams.get('type') || '';
  const currentYear = searchParams.get('year') || '';
  const currentSort = searchParams.get('sort') || 'relevance';
  const currentPage = parseInt(searchParams.get('page') || '1');

  // Update URL when filters change
  const updateUrl = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`/recherche?${params.toString()}`);
  }, [searchParams, router]);

  const clearAll = () => {
    router.push(currentQ ? `/recherche?q=${encodeURIComponent(currentQ)}` : '/recherche');
  };

  const toggleFilter = (key: string, value: string) => {
    const current = searchParams.get(key);
    updateUrl({ [key]: current === value ? null : value, page: null });
  };

  const setSort = (sort: string) => updateUrl({ sort, page: null });

  // Count active filters
  const activeFilters = [currentSubject, currentClass, currentTeacher, currentType, currentYear].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Header with stats + view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {currentQ ? (
              <>Résultats pour <span className="text-primary-600">"{currentQ}"</span></>
            ) : (
              <>Toutes les ressources</>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            <span className="font-bold text-slate-900">{formatNumber(data?.total || 0)}</span> ressources
            {data?.took ? <> · {data.took}ms</> : null}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowFilters(s => !s)}
            className="lg:hidden flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Filter className="w-4 h-4" />
            Filtres {activeFilters > 0 && <span className="px-1.5 bg-primary-600 text-white text-xs rounded-full">{activeFilters}</span>}
          </button>

          {/* Sort */}
          <select
            value={currentSort}
            onChange={e => setSort(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold bg-white"
          >
            <option value="relevance">Pertinence</option>
            <option value="recent">Plus récent</option>
            <option value="popular">Plus vus</option>
            <option value="downloads">Plus téléchargés</option>
          </select>

          {/* View mode */}
          <div className="hidden sm:flex border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-slate-400 hover:bg-slate-50'}`}
              title="Grille"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-slate-400 hover:bg-slate-50'}`}
              title="Liste"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        {/* Sidebar filters */}
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block space-y-3 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto`}>
          {/* Active filters */}
          {activeFilters > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-sm">Filtres actifs ({activeFilters})</div>
                <button onClick={clearAll} className="text-xs text-red-600 hover:underline">
                  Tout effacer
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentSubject && options?.subjects?.find((s: any) => s.id === currentSubject) && (
                  <FilterChip label={options.subjects.find((s: any) => s.id === currentSubject).nameFr} onRemove={() => updateUrl({ subject: null })} />
                )}
                {currentClass && options?.classes?.find((c: any) => c.id === currentClass) && (
                  <FilterChip label={options.classes.find((c: any) => c.id === currentClass).nameFr} onRemove={() => updateUrl({ class: null })} />
                )}
                {currentTeacher && options?.teachers?.find((t: any) => t.id === currentTeacher) && (
                  <FilterChip label={options.teachers.find((t: any) => t.id === currentTeacher).name} onRemove={() => updateUrl({ teacher: null })} />
                )}
                {currentType && (
                  <FilterChip label={TYPE_LABELS[currentType] || currentType} onRemove={() => updateUrl({ type: null })} />
                )}
                {currentYear && (
                  <FilterChip label={`Année ${currentYear}`} onRemove={() => updateUrl({ year: null })} />
                )}
              </div>
            </div>
          )}

          {/* Type filter */}
          <FilterSection title="Type" icon="📄">
            <FilterOption
              active={!currentType}
              onClick={() => updateUrl({ type: null })}
              label="Tous les types"
              count={data?.total}
            />
            {Object.entries(TYPE_LABELS).map(([value, label]) => {
              const count = facets?.types?.find((t: any) => t.value === value)?.count || 0;
              return (
                <FilterOption
                  key={value}
                  active={currentType === value}
                  onClick={() => toggleFilter('type', value)}
                  label={label}
                  icon={TYPE_ICONS[value]}
                  count={count}
                />
              );
            })}
          </FilterSection>

          {/* Subject filter */}
          {options?.subjects && options.subjects.length > 0 && (
            <FilterSection title="Matière" icon="📚">
              <FilterOption
                active={!currentSubject}
                onClick={() => updateUrl({ subject: null })}
                label="Toutes les matières"
                count={data?.total}
              />
              {options.subjects.map((s: any) => {
                const count = facets?.subjects?.find((f: any) => f.id === s.id)?.count || 0;
                if (!count) return null;
                return (
                  <FilterOption
                    key={s.id}
                    active={currentSubject === s.id}
                    onClick={() => toggleFilter('subject', s.id)}
                    label={s.nameFr}
                    icon={s.icon}
                    count={count}
                  />
                );
              })}
            </FilterSection>
          )}

          {/* Class filter */}
          {options?.classes && options.classes.length > 0 && (
            <FilterSection title="Classe" icon="🎒">
              <FilterOption
                active={!currentClass}
                onClick={() => updateUrl({ class: null })}
                label="Toutes les classes"
                count={data?.total}
              />
              {options.classes.map((c: any) => {
                const count = facets?.classes?.find((f: any) => f.id === c.id)?.count || 0;
                if (!count) return null;
                return (
                  <FilterOption
                    key={c.id}
                    active={currentClass === c.id}
                    onClick={() => toggleFilter('class', c.id)}
                    label={c.nameFr}
                    count={count}
                  />
                );
              })}
            </FilterSection>
          )}

          {/* Teacher filter */}
          {options?.teachers && options.teachers.length > 0 && (
            <FilterSection title="Enseignant" icon="👨‍🏫">
              <FilterOption
                active={!currentTeacher}
                onClick={() => updateUrl({ teacher: null })}
                label="Tous les enseignants"
                count={data?.total}
              />
              {options.teachers.map((t: any) => {
                const count = facets?.teachers?.find((f: any) => f.id === t.id)?.count || 0;
                if (!count) return null;
                return (
                  <FilterOption
                    key={t.id}
                    active={currentTeacher === t.id}
                    onClick={() => toggleFilter('teacher', t.id)}
                    label={t.name}
                    count={count}
                  />
                );
              })}
            </FilterSection>
          )}

          {/* Year filter */}
          {facets?.years && facets.years.length > 0 && (
            <FilterSection title="Année scolaire" icon="📅">
              <FilterOption
                active={!currentYear}
                onClick={() => updateUrl({ year: null })}
                label="Toutes"
                count={data?.total}
              />
              {facets.years.map((y: any) => (
                <FilterOption
                  key={y.value}
                  active={currentYear === String(y.value)}
                  onClick={() => toggleFilter('year', String(y.value))}
                  label={`${y.value - 1}-${y.value}`}
                  count={y.count}
                />
              ))}
            </FilterSection>
          )}
        </aside>

        {/* Results */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : data?.results?.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold mb-2">Aucun résultat</h3>
              <p className="text-slate-500 mb-4">Essayez d'élargir vos critères de recherche</p>
              {activeFilters > 0 && (
                <button onClick={clearAll} className="btn-primary">
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Results grid/list */}
              {viewMode === 'grid' ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {data.results.map((r: Resource) => (
                    <ResourceCard key={r.id} r={r} />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {data.results.map((r: Resource) => (
                    <ResourceListItem key={r.id} r={r} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {data?.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => updateUrl({ page: String(currentPage - 1) })}
                    className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-4 text-sm font-semibold">
                    Page {currentPage} / {data.totalPages}
                  </span>
                  <button
                    disabled={currentPage >= data.totalPages}
                    onClick={() => updateUrl({ page: String(currentPage + 1) })}
                    className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================
function FilterSection({ title, icon, children }: any) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2 font-bold text-sm">
          <span>{icon}</span>
          {title}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-slate-100 p-2 max-h-72 overflow-y-auto">{children}</div>}
    </div>
  );
}

function FilterOption({ active, onClick, label, count, icon }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition ${
        active ? 'bg-primary-50 text-primary-700 font-semibold' : 'hover:bg-slate-50 text-slate-700'
      }`}
    >
      {icon && <span className="text-sm">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className={`text-xs ${active ? 'text-primary-600' : 'text-slate-400'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function FilterChip({ label, onRemove }: any) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">
      {label}
      <button onClick={onRemove} className="hover:bg-primary-200 rounded-full p-0.5">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function ResourceCard({ r }: { r: Resource }) {
  return (
    <Link
      href={`/ressources/${r.slug}`}
      className="bg-white rounded-2xl border border-slate-200 hover:border-primary-300 hover:shadow-lg transition overflow-hidden group"
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${TYPE_COLORS[r.type]}`}>
            {TYPE_ICONS[r.type]} {TYPE_LABELS[r.type] || r.type}
          </span>
          {/* Homework subtype badge */}
          {r.type === 'HOMEWORK' && r.homeworkSubtype && HOMEWORK_SUBTYPE_LABELS[r.homeworkSubtype] && (
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${HOMEWORK_SUBTYPE_LABELS[r.homeworkSubtype].color}`}>
              {HOMEWORK_SUBTYPE_LABELS[r.homeworkSubtype].fr}
              {r.homeworkNumber ? ` N°${r.homeworkNumber}` : ''}
            </span>
          )}
          {/* Correction badge */}
          {r.hasCorrection && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-bold inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Corrigé
            </span>
          )}
          {/* Pilote badge */}
          {r.schoolType === 'PILOTE' && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-bold inline-flex items-center gap-1">
              <GraduationCap className="w-3 h-3" /> Pilote
            </span>
          )}
          {r.year && (
            <span className="text-xs text-slate-500">{r.year - 1}-{r.year}</span>
          )}
        </div>

        <h3
          className={`font-bold text-slate-900 line-clamp-2 group-hover:text-primary-600 transition mb-2 ${isArabic(r.title) ? 'text-right' : 'text-left'}`}
          dir={isArabic(r.title) ? 'rtl' : 'ltr'}
          lang={isArabic(r.title) ? 'ar' : 'fr'}
        >
          {r.title}
        </h3>

        {r.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3" dangerouslySetInnerHTML={{ __html: r.description }} />
        )}

        <div className="flex items-center gap-3 text-xs text-slate-500">
          {r.subject && (
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {r.subject.nameFr}
            </span>
          )}
          {r.class && (
            <span className="flex items-center gap-1">
              <span>🎒</span>
              {r.class.nameFr}
            </span>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {(r.teacher.firstName || "")} {(r.teacher.lastName || "").charAt(0)}.
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {formatNumber(r.viewsCount)}
            </span>
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              {formatNumber(r.downloadsCount)}
            </span>
            {r.averageRating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {r.averageRating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ResourceListItem({ r }: { r: Resource }) {
  return (
    <Link
      href={`/ressources/${r.slug}`}
      className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 hover:border-primary-300 hover:shadow transition p-4 group"
    >
      <div className={`w-14 h-14 rounded-xl ${TYPE_COLORS[r.type]} flex items-center justify-center text-2xl flex-shrink-0`}>
        {TYPE_ICONS[r.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-slate-900 truncate group-hover:text-primary-600 transition">
            {r.title}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{TYPE_LABELS[r.type]}</span>
          {r.subject && <span>· {r.subject.nameFr}</span>}
          {r.class && <span>· {r.class.nameFr}</span>}
          <span>· {(r.teacher.firstName || "")} {(r.teacher.lastName || "").charAt(0)}.</span>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 flex-shrink-0">
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {formatNumber(r.viewsCount)}
        </span>
        <span className="flex items-center gap-1">
          <Download className="w-3 h-3" />
          {formatNumber(r.downloadsCount)}
        </span>
      </div>
    </Link>
  );
}