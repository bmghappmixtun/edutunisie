import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const { stars, review } = await req.json();
  if (!stars || stars < 1 || stars > 5) {
    return NextResponse.json({ error: 'Note invalide' }, { status: 400 });
  }

  const existing = await prisma.rating.findUnique({
    where: { resourceId_userId: { resourceId: id, userId: user.id } },
  });
  if (existing) {
    await prisma.rating.update({ where: { id: existing.id }, data: { stars, review } });
  } else {
    await prisma.rating.create({ data: { resourceId: id, userId: user.id, stars, review } });
  }

  const allRatings = await prisma.rating.findMany({ where: { resourceId: id } });
  const avgRating = allRatings.reduce((sum, r) => sum + r.stars, 0) / allRatings.length;
  await prisma.resource.update({
    where: { id },
    data: { avgRating, ratingCount: allRatings.length },
  });

  return NextResponse.json({ success: true });
}
