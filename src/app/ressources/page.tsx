import Link from 'next/link';
import { Search, Filter, X, User } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ResourceCard from '@/components/resources/ResourceCard';
import ResourceListItem from '@/components/resources/ResourceListItem';
import ResourcesViewClient from '@/components/resources/ResourcesViewClient';
import { prisma } from '@/lib/prisma';
import { RESOURCE_TYPE_LABELS } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const TYPE_LABELS_FR: Record<string, string> = Object.fromEntries(
  Object.entries(RESOURCE_TYPE_LABELS).map(([k, v]) => [k, (v as any).fr])
);
const TYPES = Object.keys(RESOURCE_TYPE_LABELS);

const SORTS = [
  { value: 'recent', label: 'Plus récent' },
  { value: 'popular', label: 'Plus consulté' },
  { value: 'downloads', label: 'Plus téléchargé' },
  { value: 'rating', label: 'Mieux noté' },
];

export default async function ResourcesPage(props: { params: Promise<any>; searchParams: Promise<any> }) {
  const sp = await props.searchParams;
  const q = sp?.q || '';
  const type = sp?.type || '';
  const subject = sp?.subject || '';
  const classSlug = sp?.class || '';
  const teacherId = sp?.teacher || '';
  const sort = sp?.sort || 'recent';
  const view = sp?.view === 'list' ? 'list' : 'grid';
  const page = parseInt(sp?.page || '1');

  // Base filter: PUBLISHED + (optional) teacher
  const baseWhere: any = { status: 'PUBLISHED' };
  if (teacherId) baseWhere.teacherId = teacherId;

  // For dynamic filters: apply base filter (PUBLISHED + teacher) but NOT the
  // user-applied filters (q/type/subject/class). This way the sidebar shows
  // all options that exist for this teacher / the whole platform.
  const whereForFilterOptions: any = { ...baseWhere };

  // For the actual query: apply all filters
  const where: any = { ...baseWhere };
  if (q) where.OR = [
    { title: { contains: q } },
    { description: { contains: q } },
  ];
  if (type) where.type = type;
  if (subject) where.subject = { slug: subject };
  if (classSlug) where.class = { slug: classSlug };

  const orderBy: any = sort === 'popular' ? { viewsCount: 'desc' }
    : sort === 'downloads' ? { downloadsCount: 'desc' }
    : sort === 'rating' ? [{ avgRating: 'desc' }, { ratingCount: 'desc' }]
    : { publishedAt: 'desc' };

  // Run 4 queries in parallel:
  // 1. The page of resources (filtered)
  // 2. Total count (filtered)
  // 3. Distinct types/subjects/classes that exist (using base filter only)
  // 4. Teacher info (if filtering by teacher)
  const [resources, total, allAvailable, teacher] = await Promise.all([
    prisma.resource.findMany({
      where,
      take: 24,
      skip: (page - 1) * 24,
      orderBy,
      include: { subject: true, class: true, teacher: { select: { firstName: true, lastName: true, firstNameAr: true, lastNameAr: true } } },
    }),
    prisma.resource.count({ where }),
    // Fetch all resources matching the base filter (no type/subject/class/q)
    // to compute the available filters dynamically. Use a small projection.
    prisma.resource.findMany({
      where: whereForFilterOptions,
      select: {
        type: true,
        subject: { select: { slug: true, nameFr: true, color: true, icon: true } },
        class: { select: { slug: true, nameFr: true } },
      },
      take: 1000, // cap for safety; if teacher has > 1000 we may miss rare filters
    }),
    teacherId
      ? prisma.user.findUnique({
          where: { id: teacherId },
          select: { firstName: true, lastName: true, email: true },
        })
      : Promise.resolve(null),
  ]);

  // Compute the actual available filter values from the results
  const availableTypes = new Set<string>();
  const availableSubjectsMap = new Map<string, { slug: string; nameFr: string; color: string | null; icon: string | null }>();
  const availableClassesMap = new Map<string, { slug: string; nameFr: string }>();
  for (const r of allAvailable) {
    if (r.type) availableTypes.add(r.type);
    if (r.subject) availableSubjectsMap.set(r.subject.slug, r.subject);
    if (r.class) availableClassesMap.set(r.class.slug, r.class);
  }
  const availableSubjects = Array.from(availableSubjectsMap.values())
    .sort((a, b) => a.nameFr.localeCompare(b.nameFr, 'fr'));
  const availableClasses = Array.from(availableClassesMap.values())
    .sort((a, b) => a.nameFr.localeCompare(b.nameFr, 'fr'));

  const totalPages = Math.ceil(total / 24);
  const activeFilters = [type, subject, classSlug, q].filter(Boolean).length;
  const teacherFullName = teacher
    ? `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim()
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-24 lg:pt-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl lg:text-4xl font-extrabold mb-2 leading-tight">
              {q
                ? `Résultats pour "${q}"`
                : teacherId
                  ? <>
                      <span className="text-slate-900">Ressources de l'enseignant</span>
                      {teacherFullName && (
                        <span className="ml-3 text-amber-600">· {teacherFullName}</span>
                      )}
                    </>
                  : 'Toutes les ressources'}
            </h1>
            <p className="text-slate-600">
              {total} ressource{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''}
              {teacherFullName && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-700 font-semibold">
                  <User className="w-3 h-3" /> {teacherFullName}
                </span>
              )}
            </p>
          </div>

          {/* Search bar */}
          <form action="/ressources" method="GET" className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100 flex gap-2 mb-4">
            <input type="hidden" name="teacher" value={teacherId} />
            {type && <input type="hidden" name="type" value={type} />}
            {subject && <input type="hidden" name="subject" value={subject} />}
            {classSlug && <input type="hidden" name="class" value={classSlug} />}
            <div className="flex-1 flex items-center gap-2 px-4 py-2">
              <Search className="w-5 h-5 text-slate-400" />
              <input name="q" type="text" defaultValue={q} placeholder="Rechercher..." className="flex-1 bg-transparent outline-none text-slate-700 placeholder-slate-400 text-sm" />
            </div>
            <button type="submit" className="btn-primary">Rechercher</button>
          </form>

          <div className="grid lg:grid-cols-[280px_1fr] gap-6">
            {/* Sidebar filters - DYNAMIC: only show filters with data */}
            <aside className="bg-white rounded-2xl p-5 border border-slate-100 h-fit lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2"><Filter className="w-4 h-4" /> Filtres</h3>
                {activeFilters > 0 && <Link href={teacherId ? `/ressources?teacher=${teacherId}` : '/ressources'} className="text-xs text-primary-600 font-semibold">Réinitialiser</Link>}
              </div>

              {/* Type filter (only if > 1 type available) */}
              {availableTypes.size > 1 && (
                <div className="mb-5">
                  <h4 className="font-semibold text-sm mb-2 text-slate-700">
                    Type <span className="text-xs text-slate-400 font-normal">({availableTypes.size})</span>
                  </h4>
                  <div className="space-y-1">
                    {TYPES.filter(t => availableTypes.has(t)).map(t => (
                      <Link key={t} href={`/ressources?${new URLSearchParams({ ...sp, type: t === type ? '' : t, page: '1' }).toString()}`} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${type === t ? 'bg-primary-100 text-primary-700 font-semibold' : 'hover:bg-slate-50 text-slate-600'}`}>
                        <span>{TYPE_LABELS_FR[t] || t}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Subject filter (only if > 1 subject available) */}
              {availableSubjects.length > 1 && (
                <div className="mb-5">
                  <h4 className="font-semibold text-sm mb-2 text-slate-700">
                    Matière <span className="text-xs text-slate-400 font-normal">({availableSubjects.length})</span>
                  </h4>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {availableSubjects.map(s => (
                      <Link key={s.slug} href={`/ressources?${new URLSearchParams({ ...sp, subject: s.slug === subject ? '' : s.slug, page: '1' }).toString()}`} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${subject === s.slug ? 'bg-primary-100 text-primary-700 font-semibold' : 'hover:bg-slate-50 text-slate-600'}`}>
                        <span className="w-2 h-2 rounded-full" style={{ background: s.color || '#0EA5E9' }} />
                        <span className="flex-1">{s.nameFr}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Class filter (only if > 1 class available) */}
              {availableClasses.length > 1 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-slate-700">
                    Classe <span className="text-xs text-slate-400 font-normal">({availableClasses.length})</span>
                  </h4>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {availableClasses.map(c => (
                      <Link key={c.slug} href={`/ressources?${new URLSearchParams({ ...sp, class: c.slug === classSlug ? '' : c.slug, page: '1' }).toString()}`} className={`block px-3 py-2 rounded-lg text-sm transition ${classSlug === c.slug ? 'bg-primary-100 text-primary-700 font-semibold' : 'hover:bg-slate-50 text-slate-600'}`}>
                        {c.nameFr}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* No filters available */}
              {availableTypes.size === 0 && availableSubjects.length === 0 && availableClasses.length === 0 && (
                <p className="text-sm text-slate-500 italic">Aucun filtre disponible</p>
              )}
            </aside>

            {/* Main */}
            <div>
              {/* Sort + View toggle */}
              <div className="flex items-center justify-between mb-4 bg-white rounded-xl p-3 border border-slate-100 gap-2 flex-wrap">
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">{resources.length}</span> sur {total} résultats
                </div>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <ResourcesViewClient
                    currentView={view}
                    sp={sp}
                  />
                  <span className="text-slate-500 hidden sm:inline">Trier par :</span>
                  <select
                    className="bg-slate-50 border-0 rounded-lg px-3 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-primary-200 outline-none"
                    defaultValue={sort}
                    onChange={undefined}
                  >
                    {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Active filters chips */}
              {activeFilters > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {q && <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full">"{q}" <Link href={teacherId ? `/ressources?teacher=${teacherId}` : '/ressources'}><X className="w-3 h-3" /></Link></span>}
                  {type && <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">{TYPE_LABELS_FR[type] || type} <Link href={`/ressources?${new URLSearchParams({ ...sp, type: '', page: '1' }).toString()}`}><X className="w-3 h-3" /></Link></span>}
                  {subject && <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">{availableSubjects.find(s => s.slug === subject)?.nameFr} <Link href={`/ressources?${new URLSearchParams({ ...sp, subject: '', page: '1' }).toString()}`}><X className="w-3 h-3" /></Link></span>}
                  {classSlug && <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">{availableClasses.find(c => c.slug === classSlug)?.nameFr} <Link href={`/ressources?${new URLSearchParams({ ...sp, class: '', page: '1' }).toString()}`}><X className="w-3 h-3" /></Link></span>}
                </div>
              )}

              {/* Grid or List view */}
              {resources.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                  <div className="text-5xl mb-3">🔍</div>
                  <h3 className="font-bold text-xl mb-2">Aucun résultat</h3>
                  <p className="text-slate-500 mb-4">Essayez d'élargir vos critères de recherche</p>
                  <Link href={teacherId ? `/ressources?teacher=${teacherId}` : '/ressources'} className="btn-primary">Réinitialiser les filtres</Link>
                </div>
              ) : view === 'list' ? (
                <div className="space-y-2">
                  {resources.map(r => <ResourceListItem key={r.id} resource={r as any} />)}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {resources.map(r => <ResourceCard key={r.id} resource={r as any} />)}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {page > 1 && (
                    <Link href={`/ressources?${new URLSearchParams({ ...sp, page: String(page - 1) }).toString()}`} className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-primary-300 text-sm font-semibold">
                      ← Précédent
                    </Link>
                  )}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
                    <Link key={p} href={`/ressources?${new URLSearchParams({ ...sp, page: String(p) }).toString()}`} className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-semibold ${p === page ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 hover:border-primary-300'}`}>
                      {p}
                    </Link>
                  ))}
                  {page < totalPages && (
                    <Link href={`/ressources?${new URLSearchParams({ ...sp, page: String(page + 1) }).toString()}`} className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:border-primary-300 text-sm font-semibold">
                      Suivant →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
