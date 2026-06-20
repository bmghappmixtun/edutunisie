import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

/**
 * POST /api/admin/resource/[id]/edit
 * Approve or reject a pending edit.
 * Body: { action: 'approve' | 'reject', reason?: string }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const action = body.action;
    const reason: string | undefined = body.reason;

    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) return NextResponse.json({ error: 'Ressource introuvable' }, { status: 404 });

    if (resource.editStatus !== 'PENDING_EDIT_APPROVAL') {
      return NextResponse.json({ error: 'Aucune modification en attente' }, { status: 400 });
    }

    if (action === 'approve') {
      const pending = (resource.pendingEdit as any) || {};

      // Apply the pending edit
      const updateData: any = {
        ...pending,
        pendingEdit: Prisma.JsonNull,
        editStatus: null,
        editReviewedAt: new Date(),
        editReviewedById: user.id,
        editRejectionReason: null,
        // If title changed, update the slug
        slug: pending.title && pending.title !== resource.title
          ? `${pending.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`
          : resource.slug,
      };

      await prisma.resource.update({ where: { id }, data: updateData });

      // Notify teacher
      if (resource.editRequestedById) {
        await prisma.notification.create({
          data: {
            userId: resource.editRequestedById,
            type: 'edit_approved',
            title: 'Modification approuvée ✅',
            message: `Votre modification sur "${pending.title || resource.title}" a été approuvée et publiée.`,
            link: `/ressources/${resource.slug}`
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Modification approuvée et publiée.',
      });
    }

    if (action === 'reject') {
      await prisma.resource.update({
        where: { id },
        data: {
          pendingEdit: Prisma.JsonNull,
          editStatus: 'EDIT_REJECTED',
          editReviewedAt: new Date(),
          editReviewedById: user.id,
          editRejectionReason: reason || 'Modification refusée par l\'administrateur.',
        }
      });

      // Notify teacher
      if (resource.editRequestedById) {
        await prisma.notification.create({
          data: {
            userId: resource.editRequestedById,
            type: 'edit_rejected',
            title: 'Modification refusée ❌',
            message: `Votre modification sur "${resource.title}" a été refusée.${reason ? ` Raison : ${reason}` : ''}`,
            link: `/enseignant/ressources`
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Modification refusée.',
      });
    }

    return NextResponse.json({ error: 'Action invalide (approve|reject)' }, { status: 400 });
  } catch (e: any) {
    console.error('Edit review error:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}
