import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateTempPassword, INV_STATUS, USER_INV_STATUS } from '@/lib/invitation';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await getCurrentUser();
    if (!me || me.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const inv = await prisma.teacherInvitation.findUnique({ where: { id } });
    if (!inv) return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 });
    if (inv.status === INV_STATUS.ACTIVATED) {
      return NextResponse.json({ error: 'Cette invitation a déjà été activée' }, { status: 400 });
    }

    // Generate new temp password
    const newTemp = generateTempPassword();
    const newHash = await bcrypt.hash(newTemp, 10);
    const newExpiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.teacherInvitation.update({
        where: { id },
        data: {
          tempPassword: newHash,
          status: INV_STATUS.PENDING,
          expiresAt: newExpiresAt,
          emailSentAt: null,
          linkClickedAt: null,
          activatedAt: null,
          cancelledAt: null,
          clickCount: 0,
        },
      }),
      prisma.user.update({
        where: { id: inv.teacherId },
        data: {
          passwordHash: newHash,
          invitationStatus: USER_INV_STATUS.PENDING_INVITATION,
          mustChangePassword: true,
        },
      }),
    ]);

    // Send the email
    const { sendInvitationEmail } = await import('@/lib/invitation');
    const sendResult = await sendInvitationEmail(id, newTemp);

    if (!sendResult.ok) {
      return NextResponse.json(
        { error: sendResult.error || 'Erreur envoi email' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('resend invitation error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
