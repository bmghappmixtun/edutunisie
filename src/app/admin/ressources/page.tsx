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
  const page = parseInt(sp?.page || '1');
  const perPage = 20;

  const where: any = {};
  if (q) where.OR = [{ title: { contains: q } }, { description: { contains: q } }];
  if (status !== 'ALL') where.status = status;

  const [resources, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      take: perPage,
      skip: (page - 1) * perPage,
      orderBy: { createdAt: 'desc' },
      include: {
        subject: true,
        class: true,
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
      <form className="bg-white rounded-xl p-3 border border-slate-100 flex gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 px-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input name="q" defaultValue={q} placeholder="Rechercher par titre..." className="flex-1 bg-transparent outline-none text-sm" />
        </div>
        <select name="status" defaultValue={status} className="bg-slate-50 border-0 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="ALL">Tous les statuts</option>
          <option value="PUBLISHED">Publiés</option>
          <option value="PENDING_APPROVAL">En attente</option>
          <option value="REJECTED">Rejetés</option>
          <option value="DRAFT">Brouillons</option>
          <option value="ARCHIVED">Archivés</option>
        </select>
        <button type="submit" className="btn-primary text-sm">Filtrer</button>
      </form>

      {/* Status pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {['ALL', 'PUBLISHED', 'PENDING_APPROVAL', 'REJECTED'].map(s => (
          <Link
            key={s}
            href={`/admin/ressources?status=${s}${q ? `&q=${q}` : ''}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${status === s ? 'bg-primary-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-100'}`}
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
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Ressource</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Enseignant</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Matière/Classe</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Stats</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Statut</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r, i) => (
                <tr key={r.id} className={`border-t border-slate-50 hover:bg-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                  <td className="px-4 py-3">
                    <Link href={`/ressources/${r.slug}`} className="flex items-center gap-3 group">
                      <div className="w-8 h-10 bg-slate-100 rounded flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <div
                          className={`font-semibold text-sm group-hover:text-primary-600 truncate max-w-xs ${isArabic(r.title) ? 'text-right' : 'text-left'}`}
                          dir={isArabic(r.title) ? 'rtl' : 'ltr'}
                          lang={isArabic(r.title) ? 'ar' : 'fr'}
                        >
                          {r.title}
                        </div>
                        <div className="text-xs text-slate-500">{timeAgo(r.createdAt)}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="text-sm font-medium">{r.teacher?.firstName} {r.teacher?.lastName}</div>
                    <div className="text-xs text-slate-500">{r.teacher?.email}</div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-600">
                    <div className="font-medium">{r.subject.nameFr}</div>
                    <div className="text-slate-500">{r.class?.nameFr || '—'}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <span className="flex items-center gap-1" title="Vues"><Eye className="w-3 h-3" /> {formatNumber(r.viewsCount)}</span>
                      <span className="flex items-center gap-1" title="Téléchargements"><Download className="w-3 h-3" /> {formatNumber(r.downloadsCount)}</span>
                      <span className="flex items-center gap-1" title="Note"><Star className="w-3 h-3 text-amber-500" /> {r.avgRating.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-bold rounded ${statusColors[r.status] || 'bg-slate-100 text-slate-700'}`}>
                      {statusLabels[r.status] || r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Link
              key={p}
              href={`/admin/ressources?page=${p}${status !== 'ALL' ? `&status=${status}` : ''}${q ? `&q=${q}` : ''}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${page === p ? 'bg-primary-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-100'}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}