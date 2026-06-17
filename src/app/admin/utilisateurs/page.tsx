import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Search, Shield, UserCheck, UserX, Eye } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage(props: { params: Promise<any>; searchParams: Promise<any> }) {
  const sp = await props.searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');

  const q = sp?.q || '';
  const role = sp?.role || 'ALL';
  const page = parseInt(sp?.page || '1');

  const where: any = {};
  if (q) where.OR = [{ email: { contains: q } }, { firstName: { contains: q } }, { lastName: { contains: q } }];
  if (role !== 'ALL') where.role = role;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      take: 20,
      skip: (page - 1) * 20,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, isVerifiedTeacher: true, schoolName: true, createdAt: true, lastLoginAt: true }
    }),
    prisma.user.count({ where })
  ]);

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-700', TEACHER: 'bg-amber-100 text-amber-700', STUDENT: 'bg-blue-100 text-blue-700'
  };
  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700', PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
    PENDING_OTP: 'bg-orange-100 text-orange-700', SUSPENDED: 'bg-slate-100 text-slate-700', BANNED: 'bg-red-100 text-red-700'
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-6">👥 Gestion des utilisateurs</h1>

      <form className="bg-white rounded-xl p-3 border border-slate-100 flex gap-2 mb-6">
        <div className="flex-1 flex items-center gap-2 px-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input name="q" defaultValue={q} placeholder="Rechercher par nom, email..." className="flex-1 bg-transparent outline-none text-sm" />
        </div>
        <select name="role" defaultValue={role} className="bg-slate-50 border-0 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="ALL">Tous les rôles</option>
          <option value="ADMIN">Admin</option>
          <option value="TEACHER">Enseignant</option>
          <option value="STUDENT">Élève</option>
        </select>
        <button type="submit" className="btn-primary text-sm">Rechercher</button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 text-sm text-slate-500">
          {total} utilisateur{total > 1 ? 's' : ''} trouvé{total > 1 ? 's' : ''}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Utilisateur</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Rôle</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Statut</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Inscription</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Dernier login</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} className={`border-t border-slate-50 hover:bg-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                <td className="px-4 py-3">
                  <div className="font-semibold">{u.firstName} {u.lastName}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                  {u.schoolName && <div className="text-xs text-slate-400">{u.schoolName}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-bold rounded ${roleColors[u.role]}`}>
                    {u.role === 'ADMIN' ? '🛡️ Admin' : u.role === 'TEACHER' ? `👨‍🏫 Prof ${u.isVerifiedTeacher ? '✓' : ''}` : '👨‍🎓 Élève'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-bold rounded ${statusColors[u.status]}`}>{u.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{timeAgo(u.createdAt)}</td>
                <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <form action={`/api/admin/users/${u.id}/toggle-status`} method="POST">
                      <button className="p-1.5 hover:bg-slate-100 rounded text-xs">
                        {u.status === 'ACTIVE' ? <UserX className="w-4 h-4 text-red-500" /> : <UserCheck className="w-4 h-4 text-emerald-500" />}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total === 0 && (
          <div className="p-12 text-center text-slate-500">Aucun utilisateur trouvé</div>
        )}
      </div>
    </div>
  );
}
