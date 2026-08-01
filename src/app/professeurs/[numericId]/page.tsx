/**
 * Short URL for prof profiles: /professeurs/{numericId} (without slug)
 * → 308 redirect to the canonical URL /professeurs/{numericId}/{slug}
 *
 * Mirrors the Etsy-style pattern used for resources: numericId is the stable
 * identifier, slug is cosmetic. External linkers can use the short form.
 *
 * Visibility rule matches the full prof page:
 *   role=TEACHER + (status=ACTIVE OR isVerifiedTeacher)
 *   Admins can preview PENDING/SUSPENDED profiles.
 */
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ProfShortUrl({
  params,
}: {
  params: Promise<{ numericId: string }>;
}) {
  const { numericId: numericIdStr } = await params;
  const numericId = parseInt(numericIdStr, 10);
  if (isNaN(numericId) || numericId <= 0) notFound();

  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  // Mirror the full page's visibility filter exactly (so the metadata +
  // page agree on visibility — same lesson as the 2026-07-26 React #418 fix).
  const teacher = await prisma.user.findFirst({
    where: {
      numericId,
      role: 'TEACHER',
      ...(isAdmin
        ? {}
        : { OR: [{ status: 'ACTIVE' }, { isVerifiedTeacher: true }] }),
    },
    select: { slug: true },
  });
  if (!teacher) notFound();

  // 308 = Permanent redirect (preserves request method, SEO-friendly)
  redirect(`/professeurs/${numericId}/${teacher.slug}`);
}
