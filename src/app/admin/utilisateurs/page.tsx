import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import UsersManagementClient from '@/components/admin/UsersManagementClient';

export const dynamic = 'force-dynamic';

const ALLOWED_PAGE_SIZES = [10, 25, 50, 100];

export default async function AdminUsersPage(props: { params: Promise<any>; searchParams: Promise<any> }) {
  const sp = await props.searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');
  if (user.role !== 'ADMIN') redirect('/');

  const q = sp?.q || '';
  const role = sp?.role || 'TEACHER';
  const page = Math.max(1, parseInt(sp?.page || '1'));
  const requestedSize = parseInt(sp?.size || '25');
  const pageSize = ALLOWED_PAGE_SIZES.includes(requestedSize) ? requestedSize : 25;
  const skip = (page - 1) * pageSize;

  // Build where clause based on role + search
  const where: any = { role };
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
    ];
  }

  // Fetch users (paginated) + counts for all tabs (in parallel)
  const [users, filteredTotal, teacherCount, studentCount, adminCount] = await Promise.all([
    prisma.user.findMany({
      where,
      take: pageSize,
      skip,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        isVerifiedTeacher: true,
        schoolName: true,
        createdAt: true,
        lastLoginAt: true,
        invitationStatus: true,
        invitationSentAt: true,
        invitationActivatedAt: true,
        lastInvitationId: true,
        _count: { select: { uploadedFiles: true } },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { role: 'TEACHER' } }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
  ]);

  const counts = {
    TEACHER: teacherCount,
    STUDENT: studentCount,
    ADMIN: adminCount,
    TOTAL: teacherCount + studentCount + adminCount,
  };

  return (
    <UsersManagementClient
      initialUsers={users as any}
      initialCounts={counts}
      initialRole={role}
      initialSearch={q}
      initialPage={page}
      initialPageSize={pageSize}
      totalFiltered={filteredTotal}
    />
  );
}