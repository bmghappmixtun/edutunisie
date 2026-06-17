import Link from 'next/link';
import { Search, Filter, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ResourceCard from '@/components/resources/ResourceCard';
import { prisma } from '@/lib/prisma';
import { RESOURCE_TYPE_LABELS } from '@/lib/utils';

export const dynamic = 'force-dynamic';

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
  const sort = sp?.sort || 'recent';
  const page = parseInt(sp?.page || '1');

  const where: any = { status: 'PUBLISHED' };
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

  const [resources, total, subjects, classes] = await Promise.all([
    prisma.resource.findMany({
      where,
      take: 24,
      skip: (page - 1) * 24,
      orderBy,
      include: { subject: true, class: true, teacher: { select: { firstName: true, lastName: true } } }
    }),
    prisma.resource.count({ where }),
    prisma.subject.findMany({ orderBy: { order: 'asc' } }),
    prisma.class.findMany({ orderBy: { order: 'asc' } }),
  ]);

  const totalPages = Math.ceil(total / 24);
  const activeFilters = [type, subject, classSlug, q].filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl lg:text-4xl font-extrabold mb-2">
              {q ? `Résultats pour "${q}"` : 'Toutes les ressources'}
            </h1>
            <p className="text-slate-600">{total} ressource{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''}</p>
          </div>

          {/* Search bar */}
          <form action="/ressources" method="GET" className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100 flex gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2 px-4 py-2">
              <Search className="w-5 h-5 text-slate-400" />
              <input name="q" defaultValue={q} type="text" placeholder="Rechercher..." className="flex-1 bg-transparent outline-none text-sm" />
            </div>
            {type && <input type="hidden" name="type" value={type} />}
            {subject && <input type="hidden" name="subject" value={subject} />}
            <button type="submit" className="btn-primary">Rechercher</button>
          </form>

          <div className="grid lg:grid-cols-[280px_1fr] gap-6">
            {/* Sidebar filters */}
            <aside className="bg-white rounded-2xl p-5 border border-slate-100 h-fit lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2"><Filter className="w-4 h-4" /> Filtres</h3>
                {activeFilters > 0 && <Link href="/ressources" className="text-xs text-primary-600 font-semibold">Réinitialiser</Link>}
              </div>

              {/* Type */}
              <div className="mb-5">
                <h4 className="font-semibold text-sm mb-2 text-slate-700">Type</h4>
                <div className="space-y-1">
                  {TYPES.map(t => (
                    <Link key={t} href={`/ressources?${new URLSearchParams({ ...sp, type: t === type ? '' : t, page: '1' }).toString()}`} className={`block px-3 py-2 rounded-lg text-sm transition ${type === t ? 'bg-primary-100 text-primary-700 font-semibold' : 'hover:bg-slate-50 text-slate-600'}`}>
                      {RESOURCE_TYPE_LABELS[t].fr}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div className="mb-5">
                <h4 className="font-semibold text-sm mb-2 text-slate-700">Matière</h4>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {subjects.map(s => (
                    <Link key={s.slug} href={`/ressources?${new URLSearchParams({ ...sp, subject: s.slug === subject ? '' : s.slug, page: '1' }).toString()}`} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${subject === s.slug ? 'bg-primary-100 text-primary-700 font-semibold' : 'hover:bg-slate-50 text-slate-600'}`}>
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color || '#0EA5E9' }} />
                      <span className="flex-1">{s.nameFr}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Class */}
              <div>
                <h4 className="font-semibold text-sm mb-2 text-slate-700">Classe</h4>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {classes.map(c => (
                    <Link key={c.slug} href={`/ressources?${new URLSearchParams({ ...sp, class: c.slug === classSlug ? '' : c.slug, page: '1' }).toString()}`} className={`block px-3 py-2 rounded-lg text-sm transition ${classSlug === c.slug ? 'bg-primary-100 text-primary-700 font-semibold' : 'hover:bg-slate-50 text-slate-600'}`}>
                      {c.nameFr}
                    </Link>
                  ))}
                </div>
              </div>
            </aside>

            {/* Main */}
            <div>
              {/* Sort */}
              <div className="flex items-center justify-between mb-4 bg-white rounded-xl p-3 border border-slate-100">
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">{resources.length}</span> sur {total} résultats
                </div>
                <div className="flex items-center gap-2 text-sm">
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
                  {q && <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full">"{q}" <Link href="/ressources"><X className="w-3 h-3" /></Link></span>}
                  {type && <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">{RESOURCE_TYPE_LABELS[type].fr} <Link href="/ressources"><X className="w-3 h-3" /></Link></span>}
                  {subject && <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">{subjects.find(s => s.slug === subject)?.nameFr} <Link href="/ressources"><X className="w-3 h-3" /></Link></span>}
                  {classSlug && <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">{classes.find(c => c.slug === classSlug)?.nameFr} <Link href="/ressources"><X className="w-3 h-3" /></Link></span>}
                </div>
              )}

              {/* Grid */}
              {resources.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                  <div className="text-5xl mb-3">🔍</div>
                  <h3 className="font-bold text-xl mb-2">Aucun résultat</h3>
                  <p className="text-slate-500 mb-4">Essayez d'élargir vos critères de recherche</p>
                  <Link href="/ressources" className="btn-primary">Réinitialiser les filtres</Link>
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
                    <Link key={p} href={`/ressources?${new URLSearchParams({ ...sp, page: String(p) }).toString()}`} className={`px-4 py-2 rounded-lg text-sm font-semibold ${p === page ? 'bg-primary-500 text-white' : 'bg-white border border-slate-200 hover:border-primary-300'}`}>
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
