import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateOTP } from '@/lib/auth';
import { sendOTPEmail, sendWelcomeEmail } from '@/lib/email';
import { notifyAdminsNewTeacher } from '@/lib/admin-notify';

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName, role = 'STUDENT' } = await req.json();

    if (!email || !password || !firstName) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const otpCode = generateOTP();
    // Both students AND teachers require OTP verification first
    const status = 'PENDING_OTP';

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName: lastName || '',
        role,
        status,
        emailVerifiedAt: null,
      }
    });

    // Create OTP code (10 min expiry)
    await prisma.otpCode.create({
      data: {
        userId: user.id,
        code: otpCode,
        purpose: 'email_verification',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      }
    });

    // Send OTP (for verification)
    await sendOTPEmail(user.email, otpCode, user.firstName ?? undefined).catch(e =>
      console.error('OTP email error:', e)
    );

    // Send welcome email (different purpose - confirms account creation)
    await sendWelcomeEmail(user.email, user.firstName ?? '', user.role).catch(e =>
      console.error('Welcome email error:', e)
    );

    // If teacher, notify admins in-app
    if (user.role === 'TEACHER') {
      await notifyAdminsNewTeacher(user.id).catch(e =>
        console.error('Admin notify error:', e)
      );
    }

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      message: 'Compte créé. Un code de vérification a été envoyé à votre email.',
      email: user.email,
    });
  } catch (e: any) {
    console.error('Register error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}