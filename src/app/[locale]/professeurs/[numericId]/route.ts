/**
 * Short URL for prof profiles: /professeurs/{numericId} (without slug)
 * → real 308 redirect to /professeurs/{numericId}/{slug}
 *
 * Same Etsy-style pattern as resources/[id]. See that file for the rationale
 * of using a route handler instead of a server component page.
 *
 * Visibility filter matches the full prof page (TEACHER + ACTIVE/verified,
 * admins can preview PENDING). The same lesson as the 2026-07-26 React #418
 * fix: metadata + page must agree on the visibility filter.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ numericId: string }> }
) {
  const { numericId: numericIdStr } = await params;
  const numericId = parseInt(numericIdStr, 10);
  if (isNaN(numericId) || numericId <= 0) {
    return new NextResponse('Invalid ID', { status: 400 });
  }

  const currentUser = await getCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';

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
  if (!teacher) {
    return new NextResponse('Not found', { status: 404 });
  }

  // 308 = Permanent redirect (preserves method, SEO-friendly)
  return NextResponse.redirect(
    new URL(`/professeurs/${numericId}/${teacher.slug}`, req.url),
    308
  );
}
