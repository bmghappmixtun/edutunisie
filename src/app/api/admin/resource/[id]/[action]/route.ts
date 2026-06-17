import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { id, action } = await params;
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return NextResponse.json({ error: 'Ressource non trouvée' }, { status: 404 });

  if (action === 'approve') {
    await prisma.resource.update({
      where: { id },
      data: { status: 'PUBLISHED', approvedAt: new Date(), approvedById: user.id, publishedAt: new Date() }
    });
    if (resource.teacherId) {
      await prisma.notification.create({
        data: {
          userId: resource.teacherId,
          type: 'resource_approved',
          title: 'Ressource publiée ! ✅',
          message: `"${resource.title}" est maintenant en ligne.`,
          link: `/ressources/${resource.slug}`
        }
      });
    }
  } else if (action === 'reject') {
    await prisma.resource.update({ where: { id }, data: { status: 'REJECTED' } });
    if (resource.teacherId) {
      await prisma.notification.create({
        data: {
          userId: resource.teacherId,
          type: 'resource_rejected',
          title: 'Ressource non validée',
          message: `"${resource.title}" n'a pas été validée par l'administrateur.`,
        }
      });
    }
  } else {
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
