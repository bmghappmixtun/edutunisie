import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRequestOrigin } from '@/lib/origin';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
  if (target.role === 'ADMIN')
    return NextResponse.json({ error: 'Impossible de modifier un admin' }, { status: 403 });

  const newStatus = target.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  await prisma.user.update({ where: { id }, data: { status: newStatus } });

  return NextResponse.redirect(new URL('/admin/utilisateurs', getRequestOrigin(req)));
}
