import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTeacherFileRequestEmail } from '@/lib/email';

/**
 * POST /api/admin/teacher/[id]/request-files
 *
 * For NEW (non-invited) teachers, ask them to send 5 sample files
 * to verify they're a real teacher. Invited teachers are excluded.
 *
 * Body (optional): { note?: string }
 *
 * Effect:
 * - Sets status to PENDING_FILE_VERIFICATION
 * - Records verificationFilesRequestedAt + requestedBy
 * - Sends a professional email with the request
 * - Creates an in-app notification
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const note: string | null = (body?.note || '').toString().trim() || null;

  const teacher = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      status: true, role: true,
      invitationStatus: true, lastInvitationId: true,
      verificationFilesRequestedAt: true,
    },
  });

  if (!teacher || teacher.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Enseignant non trouvé' }, { status: 404 });
  }

  // Exclude invited teachers — they're pre-vetted by the admin
  const isInvited = !!teacher.lastInvitationId || !!teacher.invitationStatus;
  if (isInvited) {
    return NextResponse.json(
      {
        error: 'Action non applicable : cet enseignant a été invité. Les profs invités sont déjà pré-vérifiés.',
        code: 'INVITED_TEACHER',
      },
      { status: 400 }
    );
  }

  // Avoid sending duplicate requests within 24h
  if (teacher.verificationFilesRequestedAt) {
    const hoursSince = (Date.now() - new Date(teacher.verificationFilesRequestedAt).getTime()) / 1000 / 3600;
    if (hoursSince < 24) {
      return NextResponse.json(
        {
          error: `Une demande a déjà été envoyée il y a ${Math.floor(hoursSince)}h. Réessayez après 24h.`,
          code: 'ALREADY_REQUESTED',
        },
        { status: 400 }
      );
    }
  }

  if (!teacher.email || !teacher.firstName || !teacher.lastName) {
    return NextResponse.json({ error: 'Profil prof incomplet (email/nom manquant)' }, { status: 400 });
  }

  // Update DB
  await prisma.user.update({
    where: { id },
    data: {
      status: 'PENDING_FILE_VERIFICATION',
      verificationFilesRequestedAt: new Date(),
      verificationFilesRequestedById: admin.id,
      verificationFilesNote: note,
    },
  });

  // Send email
  const emailResult = await sendTeacherFileRequestEmail({
    to: teacher.email,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    email: teacher.email,
    note,
  });

  // In-app notification
  await prisma.notification.create({
    data: {
      userId: id,
      type: 'verification_files_requested',
      title: '📁 Action requise : envoyez 5 fichiers de vérification',
      message: `Bonjour ${teacher.firstName}, pour finaliser la vérification de votre compte enseignant, merci de nous envoyer 5 fichiers Word/PDF d'exemple (cours, séries, devoirs, etc.) avec votre nom et prénom. Vous avez 7 jours.`,
      link: '/enseignant/verification',
    },
  });

  return NextResponse.json({
    success: true,
    emailSent: emailResult.success,
    emailId: emailResult.id,
    message: `Demande envoyée à ${teacher.firstName} ${teacher.lastName}`,
  });
}
