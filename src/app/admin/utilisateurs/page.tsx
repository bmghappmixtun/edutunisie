import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import UsersManagementClient from '@/components/admin/UsersManagementClient';

export const dynamic = 'force-dynamic';

const ALLOWED_PAGE_SIZES = [10, 25, 50, 100];

// Sorts that require aggregation across all files of a teacher
// These MUST use raw SQL because Prisma orderBy doesn't support
// SUM/AVG on related rows.
const STATS_SORTS: Record<string, { column: string; nulls: 'first' | 'last' }> = {
  files:      { column: 'file_count',       nulls: 'last' },
  views:      { column: 'total_views',      nulls: 'last' },
  downloads:  { column: 'total_downloads',  nulls: 'last' },
  favorites:  { column: 'total_favorites',  nulls: 'last' },
  comments:   { column: 'total_comments',   nulls: 'last' },
  rating:     { column: 'weighted_rating',  nulls: 'last' },
};

export default async function AdminUsersPage(props: { params: Promise<any>; searchParams: Promise<any> }) {
  const sp = await props.searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');
  if (user.role !== 'ADMIN') redirect('/');

  const q = sp?.q || '';
  const role = sp?.role || 'TEACHER';
  const sort = sp?.sort || 'recent';
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

  const isStatsSort = sort in STATS_SORTS;

  // Fetch users (paginated + sorted) + counts (in parallel)
  const [usersRaw, filteredTotal, teacherCount, studentCount, adminCount] = await Promise.all([
    isStatsSort
      ? fetchUsersWithStats({ role, q, sort, skip, pageSize })
      : fetchUsersNormal({ where, sort, skip, pageSize }),
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
      initialUsers={usersRaw as any}
      initialCounts={counts}
      initialRole={role}
      initialSearch={q}
      initialPage={page}
      initialPageSize={pageSize}
      initialSort={sort}
      totalFiltered={filteredTotal}
    />
  );
}

// Normal Prisma query for non-stats sorts
async function fetchUsersNormal({ where, sort, skip, pageSize }: { where: any; sort: string; skip: number; pageSize: number }) {
  let orderBy: any = { createdAt: 'desc' };
  if (sort === 'name_asc') orderBy = [{ lastName: 'asc' }, { firstName: 'asc' }];
  else if (sort === 'name_desc') orderBy = [{ lastName: 'desc' }, { firstName: 'desc' }];
  else if (sort === 'oldest') orderBy = { createdAt: 'asc' };
  else if (sort === 'last_login') orderBy = { lastLoginAt: 'desc' };

  return prisma.user.findMany({
    where,
    take: pageSize,
    skip,
    orderBy,
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
  });
}

// Raw SQL query for stats-based sorts
// Aggregates file_count, total_views, total_downloads, total_favorites,
// total_comments, weighted_rating per teacher, then sorts and paginates
// the result. Works across ALL teachers, not just the current page.
async function fetchUsersWithStats({ role, q, sort, skip, pageSize }: { role: string; q: string; sort: string; skip: number; pageSize: number }) {
  const { column, nulls } = STATS_SORTS[sort];
  const orderClause = `${column} DESC NULLS ${nulls.toUpperCase()}, u."createdAt" DESC`;

  // Search filter (case-insensitive)
  const searchFilter = q
    ? Prisma.sql`AND (u.email ILIKE ${'%' + q + '%'} OR u."firstName" ILIKE ${'%' + q + '%'} OR u."lastName" ILIKE ${'%' + q + '%'})`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    WITH teacher_stats AS (
      SELECT
        "teacherId",
        COUNT(*)::int AS file_count,
        COALESCE(SUM("viewsCount"), 0)::int AS total_views,
        COALESCE(SUM("downloadsCount"), 0)::int AS total_downloads,
        COALESCE(SUM("favoritesCount"), 0)::int AS total_favorites,
        COALESCE(SUM("commentsCount"), 0)::int AS total_comments,
        CASE WHEN SUM("ratingCount") > 0
          THEN SUM("avgRating" * "ratingCount") / SUM("ratingCount")
          ELSE 0
        END AS weighted_rating
      FROM "Resource"
      WHERE "teacherId" IS NOT NULL
      GROUP BY "teacherId"
    )
    SELECT
      u.id, u.email, u."firstName", u."lastName", u.role, u.status,
      u."isVerifiedTeacher", u."schoolName", u."createdAt", u."lastLoginAt",
      u."invitationStatus", u."invitationSentAt", u."invitationActivatedAt",
      u."lastInvitationId",
      COALESCE(ts.file_count, 0)::int AS "fileCount",
      COALESCE(ts.total_views, 0)::int AS "totalViews",
      COALESCE(ts.total_downloads, 0)::int AS "totalDownloads",
      COALESCE(ts.total_favorites, 0)::int AS "totalFavorites",
      COALESCE(ts.total_comments, 0)::int AS "totalComments",
      COALESCE(ts.weighted_rating, 0)::float AS "weightedRating"
    FROM "User" u
    LEFT JOIN teacher_stats ts ON ts."teacherId" = u.id
    WHERE u.role = ${role}::text::"Role" ${searchFilter}
    ORDER BY ${Prisma.raw(orderClause)}
    LIMIT ${pageSize} OFFSET ${skip}
  `);

  // Map raw SQL result to match the Prisma select shape
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    firstName: r.firstName,
    lastName: r.lastName,
    role: r.role,
    status: r.status,
    isVerifiedTeacher: r.isVerifiedTeacher,
    schoolName: r.schoolName,
    createdAt: r.createdAt,
    lastLoginAt: r.lastLoginAt,
    invitationStatus: r.invitationStatus,
    invitationSentAt: r.invitationSentAt,
    invitationActivatedAt: r.invitationActivatedAt,
    lastInvitationId: r.lastInvitationId,
    _count: { uploadedFiles: r.fileCount },
    // Extra aggregate stats for the UI
    stats: {
      fileCount: r.fileCount,
      totalViews: r.totalViews,
      totalDownloads: r.totalDownloads,
      totalFavorites: r.totalFavorites,
      totalComments: r.totalComments,
      weightedRating: r.weightedRating,
    },
  }));
}
