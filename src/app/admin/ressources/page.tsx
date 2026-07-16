import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { FileText, Search, Eye, Download, Star } from 'lucide-react';
import { formatNumber, timeAgo } from '@/lib/utils';
import { isArabic } from '@/lib/text-utils';

export const dynamic = 'force-dynamic';

export default async function AdminResourcesPage(props: { params: Promise<any>; searchParams: Promise<any> }) {
  const sp = await props.searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');

  const q = sp?.q || '';
  const status = sp?.status || 'ALL';
  const sort = sp?.sort || 'recent';
  const page = parseInt(sp?.page || '1');
  const perPage = 20;

  const where: any = {};
  if (q) where.OR = [{ title: { contains: q } }, { description: { contains: q } }];
  if (status !== 'ALL') where.status = status;

  // Sort options
  const sortMap: Record<string, any> = {
    recent: { createdAt: 'desc' },
    oldest: { createdAt: 'asc' },
    views: { viewsCount: 'desc' },
    downloads: { downloadsCount: 'desc' },
    favorites: { favoritesCount: 'desc' },
    rating: { avgRating: 'desc' },
    comments: { commentsCount: 'desc' },
    title_asc: { title: 'asc' },
    title_desc: { title: 'desc' }
  };
  const orderBy = sortMap[sort] || sortMap.recent;

  const [resources, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      take: perPage,
      skip: (page - 1) * perPage,
      orderBy,
      include: {
        subject: true,
        class: true,
        section: true,
        teacher: { select: { firstName: true, lastName: true, email: true } }
      }
    }),
    prisma.resource.count({ where })
  ]);

  const totalPages = Math.ceil(total / perPage);

  const statusColors: Record<string, string> = {
    PUBLISHED: 'bg-emerald-100 text-emerald-700',
    PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
    REJECTED: 'bg-red-100 text-red-700',
    DRAFT: 'bg-slate-100 text-slate-700',
    ARCHIVED: 'bg-slate-200 text-slate-700'
  };

  const statusLabels: Record<string, string> = {
    PUBLISHED: '✓ Publié',
    PENDING_APPROVAL: '⏳ En attente',
    REJECTED: '✕ Rejeté',
    DRAFT: '📝 Brouillon',
    ARCHIVED: '📦 Archivé'
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">📄 Toutes les ressources</h1>

      {/* Filters */}
      <form className="bg-white rounded-xl p-3 border border-slate-100 flex flex-wrap gap-2 mb-4">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 px-3">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input name="q" defaultValue={q} placeholder="Rechercher par titre..." className="flex-1 min-w-0 bg-transparent outline-none text-sm" />
        </div>
        <select name="status" defaultValue={status} className="bg-slate-50 border-0 rounded-lg px-3 py-2 text-sm outline-none flex-shrink-0">
          <option value="ALL">Tous les statuts</option>
          <option value="PUBLISHED">Publiés</option>
          <option value="PENDING_APPROVAL">En attente</option>
          <option value="REJECTED">Rejetés</option>
          <option value="DRAFT">Brouillons</option>
          <option value="ARCHIVED">Archivés</option>
        </select>
        <select name="sort" defaultValue={sort} className="bg-slate-50 border-0 rounded-lg px-3 py-2 text-sm outline-none flex-shrink-0" title="Trier par">
          <option value="recent">📅 Plus récents</option>
          <option value="oldest">📅 Plus anciens</option>
          <option value="views">👁 Plus vus</option>
          <option value="downloads">⬇️ Plus téléchargés</option>
          <option value="favorites">❤️ Plus favoris</option>
          <option value="rating">⭐ Mieux notés</option>
          <option value="comments">💬 Plus commentés</option>
          <option value="title_asc">🔤 Titre A→Z</option>
          <option value="title_desc">🔤 Titre Z→A</option>
        </select>
        <button type="submit" className="btn-primary text-sm flex-shrink-0">Filtrer</button>
      </form>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['ALL', 'PUBLISHED', 'PENDING_APPROVAL', 'REJECTED'].map(s => (
          <Link
            key={s}
            href={`/admin/ressources?status=${s}${q ? `&q=${q}` : ''}${sort !== 'recent' ? `&sort=${sort}` : ''}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${status === s ? 'bg-primary-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-100'}`}
          >
            {s === 'ALL' ? 'Tous' : statusLabels[s] || s}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 text-sm text-slate-500">
          {total} ressource{total > 1 ? 's' : ''} trouvée{total > 1 ? 's' : ''}
        </div>
        {resources.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Aucune ressource trouvée</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {resources.map((r) => (
              <div key={r.id} className="p-4 hover:bg-slate-50 transition group">
                <div className="flex items-start gap-3">
                  {/* File icon with subject color */}
                  <div
                    className="w-12 h-14 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl"
                    style={{ background: r.subject.color ? `${r.subject.color}20` : '#F1F5F9' }}
                  >
                    {r.subject.icon || '📄'}
                  </div>
                  {/* Main info (stacked vertically) */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={r.numericId ? `/ressources/${r.numericId}/${r.slug}` : `/ressources/legacy-${r.id}/${r.slug}`}
                      className={`font-semibold text-sm group-hover:text-primary-600 block ${isArabic(r.title) ? 'text-right' : 'text-left'}`}
                      dir={isArabic(r.title) ? 'rtl' : 'ltr'}
                      lang={isArabic(r.title) ? 'ar' : 'fr'}
                    >
                      {r.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                      <span className="font-medium text-slate-700">{r.subject.nameFr}</span>
                      {r.class && <span>• {r.class.nameFr}</span>}
                      {r.section && <span>• {r.section.nameFr}</span>}
                      <span>• {timeAgo(r.createdAt)}</span>
                    </div>
                    {r.teacher && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        Par <span className="font-medium text-slate-600">{r.teacher.firstName} {r.teacher.lastName}</span>
                      </div>
                    )}
                    {/* Bottom row: stats + status + action */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1" title="Vues">
                        <Eye className="w-3.5 h-3.5" /> {formatNumber(r.viewsCount)}
                      </span>
                      <span className="flex items-center gap-1" title="Téléchargements">
                        <Download className="w-3.5 h-3.5" /> {formatNumber(r.downloadsCount)}
                      </span>
                      <span className="flex items-center gap-1" title="Note">
                        <Star className="w-3.5 h-3.5 text-amber-500" /> {r.avgRating.toFixed(1)}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${statusColors[r.status] || 'bg-slate-100 text-slate-700'}`}>
                        {statusLabels[r.status] || r.status}
                      </span>
                      <Link
                        href={r.numericId ? `/ressources/${r.numericId}/${r.slug}` : `/ressources/legacy-${r.id}/${r.slug}`}
                        target="_blank"
                        className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded transition"
                        title="Voir la ressource"
                      >
                        <Eye className="w-3.5 h-3.5" /> Voir
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-6 flex-wrap">
          {/* Prev button */}
          {page > 1 && (
            <Link
              href={`/admin/ressources?page=${page - 1}${status !== 'ALL' ? `&status=${status}` : ''}${q ? `&q=${q}` : ''}${sort !== 'recent' ? `&sort=${sort}` : ''}`}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white text-slate-600 hover:bg-slate-100 border border-slate-100 transition"
            >
              ‹ Précédent
            </Link>
          )}
          {/* Page numbers with ellipsis */}
          {(() => {
            const buildHref = (p: number) =>
              `/admin/ressources?page=${p}${status !== 'ALL' ? `&status=${status}` : ''}${q ? `&q=${q}` : ''}${sort !== 'recent' ? `&sort=${sort}` : ''}`;
            const pages: (number | '…')[] = [];
            if (totalPages <= 7) {
              for (let i = 1; i <= totalPages; i++) pages.push(i);
            } else {
              // Always show first
              pages.push(1);
              // Left ellipsis
              if (page > 4) pages.push('…');
              // Window around current
              const start = Math.max(2, page - 1);
              const end = Math.min(totalPages - 1, page + 1);
              for (let i = start; i <= end; i++) pages.push(i);
              // Right ellipsis
              if (page < totalPages - 3) pages.push('…');
              // Always show last
              pages.push(totalPages);
            }
            return pages.map((p, idx) =>
              p === '…' ? (
                <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-sm text-slate-400 select-none">
                  …
                </span>
              ) : (
                <Link
                  key={p}
                  href={buildHref(p)}
                  className={`min-w-[36px] text-center px-3 py-1.5 rounded-lg text-sm font-semibold transition ${page === p ? 'bg-primary-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-100'}`}
                >
                  {p}
                </Link>
              )
            );
          })()}
          {/* Next button */}
          {page < totalPages && (
            <Link
              href={`/admin/ressources?page=${page + 1}${status !== 'ALL' ? `&status=${status}` : ''}${q ? `&q=${q}` : ''}${sort !== 'recent' ? `&sort=${sort}` : ''}`}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white text-slate-600 hover:bg-slate-100 border border-slate-100 transition"
            >
              Suivant ›
            </Link>
          )}
        </div>
      )}
    </div>
  );
}