import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ResourceCard from '@/components/resources/ResourceCard';
import { prisma } from '@/lib/prisma';
import { Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SearchPage(props: { params: Promise<any>; searchParams: Promise<any> }) {
  const sp = await props.searchParams;
  const q = sp?.q || '';

  const where: any = { status: 'PUBLISHED' };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { tags: { contains: q } },
    ];
  }

  const resources = await prisma.resource.findMany({
    where,
    take: 30,
    orderBy: { publishedAt: 'desc' },
    include: { subject: true, class: true, teacher: { select: { firstName: true, lastName: true } } }
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        <div className="bg-gradient-to-br from-primary-50 to-sky-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl lg:text-4xl font-extrabold mb-4">
              {q ? `Résultats pour "${q}"` : 'Recherche'}
            </h1>
            <form action="/recherche" method="GET" className="bg-white rounded-2xl p-2 shadow-lg flex gap-2 max-w-2xl">
              <div className="flex-1 flex items-center gap-2 px-4 py-2">
                <Search className="w-5 h-5 text-slate-400" />
                <input name="q" defaultValue={q} type="text" placeholder="Rechercher..." className="flex-1 bg-transparent outline-none" />
              </div>
              <button type="submit" className="btn-primary">Rechercher</button>
            </form>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {q && <p className="text-slate-600 mb-6">{resources.length} résultat{resources.length > 1 ? 's' : ''}</p>}

          {resources.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
              <div className="text-5xl mb-3">🔍</div>
              <h3 className="font-bold text-xl mb-2">{q ? 'Aucun résultat' : 'Lancez une recherche'}</h3>
              <p className="text-slate-500 mb-4">{q ? 'Essayez d\'autres mots-clés' : 'Tapez un terme ci-dessus pour commencer'}</p>
              <Link href="/ressources" className="btn-primary">Voir toutes les ressources</Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {resources.map(r => <ResourceCard key={r.id} resource={r as any} />)}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
