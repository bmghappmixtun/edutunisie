export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sendNewEditPendingEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { autoGenerateTags } from '@/lib/auto-tagger';

export const runtime = 'nodejs';

/**
 * PATCH /api/teacher/resources/[id]
 * Update a resource. Creates a pending edit that requires admin re-approval.
 * Body: { title?, description?, type?, subjectId?, classId?, sectionId?, trimester?, year?, tags? }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Réservé aux enseignants' }, { status: 403 });
    }

    const { id } = await params;
    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) return NextResponse.json({ error: 'Ressource introuvable' }, { status: 404 });

    // Only the owner (or admin) can edit
    if (user.role !== 'ADMIN' && resource.teacherId !== user.id) {
      return NextResponse.json(
        { error: "Vous n'êtes pas le propriétaire de cette ressource" },
        { status: 403 },
      );
    }

    // Block if there's already a pending edit
    if (resource.editStatus === 'PENDING_EDIT_APPROVAL') {
      return NextResponse.json(
        {
          error:
            "Une modification est déjà en attente d'approbation. Attendez qu'elle soit traitée.",
        },
        { status: 409 },
      );
    }

    const body = await req.json();
    const allowed: any = {
      title: body.title,
      description: body.description,
      type: body.type,
      subjectId: body.subjectId,
      classId: body.classId,
      sectionId: body.sectionId,
      trimester: body.trimester,
      year: body.year,
      tags: body.tags,
      language: body.language,
      // Homework & school metadata (NEW)
      homeworkSubtype: body.homeworkSubtype,
      homeworkNumber: body.homeworkNumber,
      schoolType: body.schoolType,
      product: body.product,
      hasCorrection: body.hasCorrection,
      correctionSummary: body.correctionSummary,
    };

    // Validate enums and ranges
    if (allowed.homeworkSubtype !== undefined) {
      const ok = ['CONTROL', 'SYNTHESIS', 'HOUSEWORK', null].includes(allowed.homeworkSubtype);
      if (!ok) delete allowed.homeworkSubtype;
    }
    if (allowed.homeworkNumber !== undefined) {
      const n = parseInt(String(allowed.homeworkNumber), 10);
      allowed.homeworkNumber = Number.isFinite(n) && n >= 1 && n <= 20 ? n : null;
    }
    if (allowed.schoolType !== undefined) {
      const ok = ['PUBLIC', 'PILOTE', null].includes(allowed.schoolType);
      if (!ok) delete allowed.schoolType;
    }
    if (allowed.hasCorrection !== undefined) {
      allowed.hasCorrection = allowed.hasCorrection === true || allowed.hasCorrection === 'true';
    }

    // Strip undefined values
    const pendingEdit: any = {};
    for (const [k, v] of Object.entries(allowed)) {
      if (v !== undefined) pendingEdit[k] = v;
    }

    // Re-generate smart SEO tags if any tag-relevant field changed
    const tagRelevantFields = [
      'title',
      'type',
      'subjectId',
      'classId',
      'sectionId',
      'year',
      'trimester',
      'homeworkSubtype',
      'homeworkNumber',
      'hasCorrection',
    ];
    const needsRetag = tagRelevantFields.some(
      (f) => f in pendingEdit && (pendingEdit as any)[f] !== (resource as any)[f],
    );
    if (needsRetag && resource.subjectId && resource.classId) {
      const [subjectRec, classRec] = await Promise.all([
        pendingEdit.subjectId
          ? prisma.subject.findUnique({ where: { id: pendingEdit.subjectId } })
          : prisma.subject.findUnique({ where: { id: resource.subjectId! } }),
        pendingEdit.classId
          ? prisma.class.findUnique({ where: { id: pendingEdit.classId } })
          : prisma.class.findUnique({ where: { id: resource.classId! } }),
      ]);
      if (subjectRec && classRec) {
        const autoTags = autoGenerateTags({
          title: pendingEdit.title || resource.title,
          subjectSlug: subjectRec.slug,
          classSlug: classRec.slug,
          sectionSlug:
            pendingEdit.sectionId === undefined
              ? resource.sectionId || null
              : pendingEdit.sectionId || null,
          type: pendingEdit.type || resource.type,
          year: pendingEdit.year !== undefined ? pendingEdit.year : resource.year,
          trimester:
            pendingEdit.trimester !== undefined ? pendingEdit.trimester : resource.trimester,
          homeworkSubtype:
            pendingEdit.homeworkSubtype !== undefined
              ? pendingEdit.homeworkSubtype
              : resource.homeworkSubtype,
          homeworkNumber:
            pendingEdit.homeworkNumber !== undefined
              ? pendingEdit.homeworkNumber
              : resource.homeworkNumber,
          hasCorrection:
            pendingEdit.hasCorrection !== undefined
              ? pendingEdit.hasCorrection
              : resource.hasCorrection,
        });
        const userTags = pendingEdit.tags
          ? String(pendingEdit.tags)
              .split(',')
              .map((t: string) => t.trim())
              .filter(Boolean)
          : [];
        pendingEdit.tags = Array.from(new Set([...userTags, ...autoTags]))
          .slice(0, 15)
          .join(',');
      }
    }

    if (Object.keys(pendingEdit).length === 0) {
      return NextResponse.json({ error: 'Aucune modification fournie' }, { status: 400 });
    }

    // Build a human-readable summary of changes
    const changes: string[] = [];
    for (const [k, v] of Object.entries(pendingEdit)) {
      if ((resource as any)[k] !== v) {
        changes.push(k);
      }
    }
    const summary = changes.length ? changes.map((c) => c).join(', ') : 'aucun changement détecté';

    // Was this edit previously rejected? If so, surface the reason in the
    // admin notification + email so the admin knows what was fixed.
    const wasPreviouslyRejected = resource.editStatus === 'EDIT_REJECTED';
    const previousRejectionReason = resource.editRejectionReason || undefined;

    // Admins can apply directly; teachers create a pending edit
    if (user.role === 'ADMIN') {
      const updated = await prisma.resource.update({
        where: { id },
        data: {
          ...pendingEdit,
          // Update slug if title changed
          slug:
            pendingEdit.title && pendingEdit.title !== resource.title
              ? `${pendingEdit.title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-|-$/g, '')}-${Date.now().toString(36)}`
              : resource.slug,
        },
      });
      return NextResponse.json({
        success: true,
        mode: 'direct',
        resource: updated,
        message: 'Ressource mise à jour (admin)',
      });
    }

    // Teacher: create pending edit
    await prisma.resource.update({
      where: { id },
      data: {
        pendingEdit,
        editStatus: 'PENDING_EDIT_APPROVAL',
        editRequestedAt: new Date(),
        editRequestedById: user.id,
        editSummary: summary,
        editRejectionReason: null, // clear any previous rejection reason
        editReviewedAt: null,
        editReviewedById: null,
      },
    });

    // Notify all admins (in-app + email)
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, email: true, firstName: true },
    });
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: 'edit_pending',
        title: wasPreviouslyRejected ? 'Modification re-soumise 🔄' : 'Modification en attente ✏️',
        message: `${user.firstName || ''} ${user.lastName || ''} a ${wasPreviouslyRejected ? 're-soumis une modification sur' : 'modifié'} "${resource.title}" — en attente d'approbation.`,
        link: `/admin/ressources/editions`,
      })),
    });

    // Send email to all admins
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
    const reviewUrl = `${siteUrl}/admin/ressources/editions`;
    const teacherFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    for (const admin of admins) {
      if (admin.email && admin.firstName) {
        await sendNewEditPendingEmail(
          admin.email,
          teacherFullName,
          resource.title,
          summary,
          reviewUrl,
          wasPreviouslyRejected,
          previousRejectionReason,
        );
      }
    }

    return NextResponse.json({
      success: true,
      mode: 'pending',
      summary,
      message:
        'Modification enregistrée. Elle sera publiée après approbation par un administrateur.',
    });
  } catch (e: any) {
    console.error('PATCH resource error:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/teacher/resources/[id]
 * Delete a resource. Only the owner can delete.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      return NextResponse.json({ error: "Vous n'êtes pas le propriétaire" }, { status: 403 });
    }

    // Delete related records
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { resourceId: id } }),
      prisma.rating.deleteMany({ where: { resourceId: id } }),
      prisma.favorite.deleteMany({ where: { resourceId: id } }),
      prisma.view.deleteMany({ where: { resourceId: id } }),
      prisma.download.deleteMany({ where: { resourceId: id } }),
      prisma.report.deleteMany({ where: { resourceId: id } }),
      prisma.resource.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true, message: 'Ressource supprimée' });
  } catch (e: any) {
    console.error('DELETE resource error:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}
