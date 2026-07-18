export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTeacherApprovalEmail } from '@/lib/email';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { id, action } = await params;
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  }

  const teacher = await prisma.user.findUnique({
    where: { id },
  });
  if (!teacher || teacher.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Enseignant non trouvé' }, { status: 404 });
  }

  if (action === 'approve') {
    await prisma.user.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        isVerifiedTeacher: true,
        approvedAt: new Date(),
        approvedById: user.id,
      },
    });
    await prisma.notification.create({
      data: {
        userId: id,
        type: 'account_approved',
        title: 'Compte approuvé ! 🎉',
        message:
          'Votre compte enseignant a été approuvé. Vous pouvez maintenant partager vos ressources.',
        link: '/enseignant',
      },
    });
    if (teacher.email && teacher.firstName) {
      // Parse teachingSubjects (stored as JSON string) and level
      let subjects: string[] = [];
      try {
        if (teacher.teachingSubjects) {
          const parsed = JSON.parse(teacher.teachingSubjects);
          if (Array.isArray(parsed)) subjects = parsed;
        }
      } catch {}

      await sendTeacherApprovalEmail(teacher.email, teacher.firstName, true, {
        lastName: teacher.lastName || undefined,
        dashboardUrl: `${SITE_URL}/enseignant`,
        subjects,
        level: teacher.schoolLevel || teacher.classLevel || undefined,
      });
    }
  } else {
    await prisma.user.update({ where: { id }, data: { status: 'SUSPENDED' } });
    await prisma.notification.create({
      data: {
        userId: id,
        type: 'account_rejected',
        title: 'Compte non approuvé',
        message: "Votre demande de compte enseignant n'a pas été acceptée.",
      },
    });
    if (teacher.email && teacher.firstName) {
      await sendTeacherApprovalEmail(teacher.email, teacher.firstName, false, {
        lastName: teacher.lastName || undefined,
      });
    }
  }

  return NextResponse.json({ success: true });
}
