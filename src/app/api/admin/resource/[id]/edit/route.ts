import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { sendEditApprovedEmail, sendEditRejectedEmail } from '@/lib/email';

export const runtime = 'nodejs';

/**
 * POST /api/admin/resource/[id]/edit
 * Approve or reject a pending edit (same workflow as new resource approval).
 * Body: { action: 'approve' | 'reject', reason?: string }
 *
 * - Approve: applies the pendingEdit JSON to the resource, clears the edit
 *   state, sends an approval email + in-app notification to the teacher.
 * - Reject: clears pendingEdit, marks as EDIT_REJECTED, saves the reason,
 *   sends a rejection email (with the reason) + in-app notification.
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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
    const newSlug = (pending: any) =>
      pending.title && pending.title !== resource.title
        ? `${pending.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`
        : resource.slug;
    const resourceUrl = `${siteUrl}/ressources/${resource.slug}`;

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
        slug: newSlug(pending),
      };

      await prisma.resource.update({ where: { id }, data: updateData });
      // Force revalidation of all relevant pages
      revalidatePath('/ressources');
      revalidatePath(`/ressources/${resource.slug}`);
      revalidatePath('/');
      revalidatePath('/enseignant/ressources');
      revalidatePath('/admin/ressources/editions');
      revalidatePath('/admin/ressources');
      if (resource.teacherId) revalidatePath(`/professeurs/${resource.teacherId}`);

      const finalUrl = `${siteUrl}/ressources/${newSlug(pending)}`;

      // Notify teacher
      if (resource.editRequestedById) {
        await prisma.notification.create({
          data: {
            userId: resource.editRequestedById,
            type: 'edit_approved',
            title: 'Modification approuvée ✅',
            message: `Votre modification sur "${pending.title || resource.title}" a été approuvée et publiée.`,
            link: `/ressources/${newSlug(pending)}`
          }
        });

        // Send email to teacher
        const teacher = await prisma.user.findUnique({ where: { id: resource.editRequestedById } });
        if (teacher?.email && teacher.firstName) {
          await sendEditApprovedEmail(
            teacher.email,
            teacher.firstName,
            pending.title || resource.title,
            finalUrl
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Modification approuvée et publiée.',
      });
    }

    if (action === 'reject') {
      const finalReason = reason?.trim() || 'Modification refusée par l\'administrateur.';
      await prisma.resource.update({
        where: { id },
        data: {
          pendingEdit: Prisma.JsonNull,
          editStatus: 'EDIT_REJECTED',
          editReviewedAt: new Date(),
          editReviewedById: user.id,
          editRejectionReason: finalReason,
        }
      });
      revalidatePath('/admin/ressources/editions');
      revalidatePath('/enseignant/ressources');
      if (resource.teacherId) revalidatePath(`/professeurs/${resource.teacherId}`);

      // Notify teacher
      if (resource.editRequestedById) {
        await prisma.notification.create({
          data: {
            userId: resource.editRequestedById,
            type: 'edit_rejected',
            title: 'Modification refusée ❌',
            message: `Votre modification sur "${resource.title}" a été refusée.${finalReason ? ` Motif : ${finalReason.slice(0, 100)}` : ''}`,
            link: `/enseignant/ressources`
          }
        });

        // Send email to teacher
        const teacher = await prisma.user.findUnique({ where: { id: resource.editRequestedById } });
        if (teacher?.email && teacher.firstName) {
          await sendEditRejectedEmail(
            teacher.email,
            teacher.firstName,
            resource.title,
            finalReason,
            resourceUrl
          );
        }
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
