import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, setSessionCookie } from '@/lib/auth';
import { sendWelcomeConfirmedEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ error: 'Email et code requis' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });

    // Already verified?
    if (user.emailVerifiedAt) {
      // Auto-login if active
      if (user.status === 'ACTIVE') {
        const { token, expiresAt } = await createSession(user.id);
        await setSessionCookie(token, expiresAt);
        return NextResponse.json({ success: true, status: 'ACTIVE', autoLoggedIn: true });
      }
      return NextResponse.json({ success: true, status: user.status });
    }

    const otp = await prisma.otpCode.findFirst({
      where: { userId: user.id, purpose: 'email_verification', consumedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    if (!otp) {
      return NextResponse.json({ error: 'Aucun code en attente. Demandez un nouveau code.' }, { status: 400 });
    }
    if (otp.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Code expiré. Demandez un nouveau code.' }, { status: 400 });
    }
    if (otp.attempts >= 5) {
      return NextResponse.json({ error: 'Trop de tentatives. Demandez un nouveau code.' }, { status: 429 });
    }
    if (otp.code !== code) {
      await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      return NextResponse.json({ error: 'Code incorrect' }, { status: 400 });
    }

    // Mark OTP as consumed
    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

    // Update user: verify email + set appropriate status
    // - STUDENT → ACTIVE (can login immediately)
    // - TEACHER → PENDING_APPROVAL (admin must approve)
    const newStatus = user.role === 'TEACHER' ? 'PENDING_APPROVAL' : 'ACTIVE';
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        status: newStatus,
        emailVerifiedAt: new Date()
      }
    });

    // Send confirmation email after successful verification
    await sendWelcomeConfirmedEmail(updated.email, updated.firstName ?? '', updated.role).catch(e =>
      console.error('Confirmation email error:', e)
    );

    // Auto-login for students
    if (updated.status === 'ACTIVE') {
      const { token, expiresAt } = await createSession(updated.id);
      await setSessionCookie(token, expiresAt);
    }

    return NextResponse.json({
      success: true,
      status: updated.status,
      role: updated.role,
      message: updated.status === 'ACTIVE'
        ? 'Email vérifié ! Bienvenue sur EduTunisie.'
        : 'Email vérifié ! Votre compte enseignant est en attente d\'approbation par un administrateur.'
    });
  } catch (e: any) {
    console.error('Verify OTP error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}