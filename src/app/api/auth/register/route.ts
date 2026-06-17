import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateOTP, createSession, setSessionCookie } from '@/lib/auth';
import { sendOTPEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName, role = 'STUDENT' } = await req.json();

    if (!email || !password || !firstName) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const otpCode = generateOTP();
    const status = role === 'TEACHER' ? 'PENDING_APPROVAL' : 'PENDING_OTP';

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        status,
        emailVerifiedAt: role !== 'TEACHER' ? new Date() : null,
      }
    });

    await prisma.otpCode.create({
      data: {
        userId: user.id,
        code: otpCode,
        purpose: role === 'TEACHER' ? 'email_verification' : 'email_verification',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      }
    });

    await sendOTPEmail(email, otpCode, 'verification');

    // Auto-activate non-teachers for demo
    if (role !== 'TEACHER') {
      await prisma.user.update({ where: { id: user.id }, data: { status: 'ACTIVE', emailVerifiedAt: new Date() } });
      const { token, expiresAt } = await createSession(user.id);
      await setSessionCookie(token, expiresAt);
      return NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName }
      });
    }

    return NextResponse.json({ success: true, message: 'Compte créé. Un code OTP a été envoyé à votre email.' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
