import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ resourceId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { resourceId } = await params;
  const existing = await prisma.favorite.findUnique({
    where: { userId_resourceId: { userId: user.id, resourceId } }
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    await prisma.resource.update({ where: { id: resourceId }, data: { favoritesCount: { decrement: 1 } } });
    return NextResponse.json({ favorited: false });
  } else {
    await prisma.favorite.create({ data: { userId: user.id, resourceId } });
    await prisma.resource.update({ where: { id: resourceId }, data: { favoritesCount: { increment: 1 } } });
    return NextResponse.json({ favorited: true });
  }
}
