export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendResourceApprovedEmail, sendResourceRejectedEmail } from '@/lib/email';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { id, action } = await params;
  const resource = await prisma.resource.findUnique({
    where: { id },
    include: { teacher: { select: { numericId: true, slug: true } } },
  });
  if (!resource) return NextResponse.json({ error: 'Ressource non trouvée' }, { status: 404 });

  // Accept optional body (e.g., rejection reason)
  let body: { reason?: string } = {};
  try {
    body = await req.json();
  } catch {
    // No body or invalid JSON, use empty
  }

  if (action === 'approve') {
    await prisma.resource.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        approvedAt: new Date(),
        approvedById: user.id,
        publishedAt: new Date(),
      },
    });
    // Force revalidation of all relevant pages (public list + detail + filters)
    revalidatePath('/ressources');
    revalidatePath(`/ressources/${resource.numericId}/${resource.slug}`);
    revalidatePath('/');
    revalidatePath('/enseignant/ressources');
    revalidatePath('/admin/approbations');
    revalidatePath('/admin/ressources');
    revalidatePath('/admin');
    if (resource.teacherId && resource.teacher) {
      revalidatePath(`/professeurs/${resource.teacher.numericId}/${resource.teacher.slug}`);
    }
    if (resource.teacherId) {
      await prisma.notification.create({
        data: {
          userId: resource.teacherId,
          type: 'resource_approved',
          title: 'Ressource publiée ! ✅',
          message: `"${resource.title}" est maintenant en ligne.`,
          link: `/ressources/${resource.numericId}/${resource.slug}`,
        },
      });
      const teacher = await prisma.user.findUnique({ where: { id: resource.teacherId } });
      if (teacher?.email && teacher.firstName) {
        await sendResourceApprovedEmail(
          teacher.email,
          teacher.firstName,
          resource.title,
          true,
          `/ressources/${resource.numericId}/${resource.slug}`,
        );
      }
    }
  } else if (action === 'reject') {
    const reason = (body.reason || '').trim() || "Aucun motif fourni par l'administrateur.";
    await prisma.resource.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        approvedById: user.id,
      },
    });
    if (resource.teacherId) {
      await prisma.notification.create({
        data: {
          userId: resource.teacherId,
          type: 'resource_rejected',
          title: 'Ressource non validée ❌',
          message: reason.length > 100 ? reason.slice(0, 100) + '...' : reason,
          link: `/ressources/${resource.numericId}/${resource.slug}`,
        },
      });
      const teacher = await prisma.user.findUnique({ where: { id: resource.teacherId } });
      if (teacher?.email && teacher.firstName) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
        const resourceUrl = `${siteUrl}/ressources/${resource.numericId}/${resource.slug}`;
        await sendResourceRejectedEmail(
          teacher.email,
          teacher.firstName,
          resource.title,
          reason,
          resourceUrl,
        );
      }
    }
  } else {
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
