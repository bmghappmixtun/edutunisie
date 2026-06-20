import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/teacher/resources/[id]/file
 * Replace the PDF file of a resource. Creates a pending edit that requires admin re-approval.
 * Body: multipart/form-data with field "file"
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Réservé aux enseignants' }, { status: 403 });
    }

    const { id } = await params;
    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) return NextResponse.json({ error: 'Ressource introuvable' }, { status: 404 });

    if (user.role !== 'ADMIN' && resource.teacherId !== user.id) {
      return NextResponse.json({ error: 'Vous n\'êtes pas le propriétaire' }, { status: 403 });
    }

    if (resource.editStatus === 'PENDING_EDIT_APPROVAL') {
      return NextResponse.json({
        error: 'Une modification est déjà en attente d\'approbation.'
      }, { status: 409 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Le fichier doit être un PDF' }, { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 50 MB)' }, { status: 400 });
    }

    // Upload new file
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'pdf';
    const fileName = `resources/${id}/pending-${Date.now()}.${ext}`;
    const uploadResult: any = await uploadFile(fileName, buffer, "application/pdf");
    const fileUrl = uploadResult.url || uploadResult;

    // Get current pendingEdit (or empty object) and merge file info
    const currentPending = (resource.pendingEdit as any) || {};
    const newPending = {
      ...currentPending,
      fileKey: uploadResult.key || fileName,
      fileUrl,
      fileSize: file.size,
    };

    // Admin: apply directly
    if (user.role === 'ADMIN') {
      await prisma.resource.update({
        where: { id },
        data: {
          fileKey: uploadResult.key || fileName,
          fileUrl,
          fileSize: file.size,
        }
      });
      return NextResponse.json({
        success: true,
        mode: 'direct',
        message: 'Fichier remplacé (admin)',
      });
    }

    // Teacher: pending edit
    await prisma.resource.update({
      where: { id },
      data: {
        pendingEdit: newPending,
        editStatus: 'PENDING_EDIT_APPROVAL',
        editRequestedAt: new Date(),
        editRequestedById: user.id,
        editSummary: `fichier remplacé (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
        editRejectionReason: null,
        editReviewedAt: null,
        editReviewedById: null,
      }
    });

    // Notify admins
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    await prisma.notification.createMany({
      data: admins.map(a => ({
        userId: a.id,
        type: 'edit_pending',
        title: 'Fichier remplacé (en attente) ✏️',
        message: `${user.firstName} ${user.lastName} a remplacé le fichier de "${resource.title}" — en attente d'approbation.`,
        link: `/admin/ressources/editions`
      }))
    });

    return NextResponse.json({
      success: true,
      mode: 'pending',
      message: 'Nouveau fichier en attente d\'approbation par un administrateur.',
    });
  } catch (e: any) {
    console.error('File upload error:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}
