import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import InvitationsClient from '@/components/admin/InvitationsClient';
import { expireStaleInvitations } from '@/lib/invitation';

export const dynamic = 'force-dynamic';

export default async function AdminInvitationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');
  if (user.role !== 'ADMIN') redirect('/');

  // Auto-expire stale invitations on page load
  await expireStaleInvitations();

  // Fetch all invitations (limit 200 for initial view)
  const [invitations, stats] = await Promise.all([
    prisma.teacherInvitation.findMany({
      take: 200,
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            _count: { select: { uploadedFiles: true } }
          }
        },
        invitedBy: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    }),
    prisma.teacherInvitation.groupBy({
      by: ['status'],
      _count: { status: true },
    })
  ]);

  const statsMap: Record<string, number> = {
    PENDING: 0, SENT: 0, CLICKED: 0, ACTIVATED: 0, EXPIRED: 0, CANCELLED: 0,
  };
  stats.forEach((s: any) => {
    statsMap[s.status] = s._count.status;
  });

  return (
    <InvitationsClient
      initialInvitations={invitations as any}
      initialStats={statsMap}
    />
  );
}