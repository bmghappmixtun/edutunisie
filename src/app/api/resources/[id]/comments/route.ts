import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comments = await prisma.comment.findMany({
    where: { resourceId: id, parentId: null },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const { content } = await req.json();
  if (!content || content.length < 3 || content.length > 1000) {
    return NextResponse.json({ error: 'Commentaire invalide' }, { status: 400 });
  }

  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return NextResponse.json({ error: 'Ressource non trouvée' }, { status: 404 });

  const comment = await prisma.comment.create({
    data: { resourceId: id, userId: user.id, content },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  await prisma.resource.update({ where: { id }, data: { commentsCount: { increment: 1 } } });

  // Notify teacher
  if (resource.teacherId && resource.teacherId !== user.id) {
    await prisma.notification.create({
      data: {
        userId: resource.teacherId,
        type: 'new_comment',
        title: 'Nouveau commentaire',
        message: `${user.firstName || ''} ${user.lastName || ''} a commenté votre ressource "${resource.title}"`,
        link: `/ressources/${resource.numericId}/${resource.slug}`,
      },
    });
  }

  return NextResponse.json({ comment }, { status: 201 });
}
