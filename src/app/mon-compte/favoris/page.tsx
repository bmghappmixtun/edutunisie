import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import ResourceCard from '@/components/resources/ResourceCard';

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      resource: {
        include: {
          subject: true,
          class: true,
          teacher: {
            select: { firstName: true, lastName: true, firstNameAr: true, lastNameAr: true },
          },
        },
      },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">Mes favoris ❤️</h1>
      {favorites.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <div className="text-5xl mb-3">💔</div>
          <h3 className="font-bold text-xl mb-2">Aucun favori</h3>
          <p className="text-slate-500 mb-4">
            Ajoutez des ressources à vos favoris pour les retrouver ici
          </p>
          <a href="/ressources" className="btn-primary">
            Explorer les ressources
          </a>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {favorites.map((f) => (
            <form key={f.id} action={`/api/favorites/${f.resource.id}`} method="POST">
              <input type="hidden" name="_action" value="remove" />
              <ResourceCard resource={f.resource as any} />
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
