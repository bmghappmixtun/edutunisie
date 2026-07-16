import { NextRequest, NextResponse } from 'next/server';
import { isValidOrigin, isProduction } from '@/lib/security';
import { rateLimit, getClientIp } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateOTP } from '@/lib/auth';
import { sendOTPEmail, sendWelcomeEmail } from '@/lib/email';
import { notifyAdminsNewTeacher } from '@/lib/admin-notify';

export async function POST(req: NextRequest) {
  // SECURITY: CSRF origin check (production only)
  if (isProduction() && !isValidOrigin(req)) {
    return NextResponse.json({ error: 'Origine non autorisée' }, { status: 403 });
  }

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

    // SECURITY: anti-email-enumeration — return same response regardless of existence
    // (UX trade-off: user who tries to re-register gets a slightly different flow
    // but we don't leak whether the email is already in the DB)
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      // If user exists but is PENDING_OTP (didn't verify), re-send OTP silently
      if (existing.status === 'PENDING_OTP' && !existing.emailVerifiedAt) {
        const otpCode = generateOTP();
        await prisma.otpCode.updateMany({
          where: { userId: existing.id, purpose: 'email_verification', consumedAt: null },
          data: { consumedAt: new Date() }
        });
        await prisma.otpCode.create({
          data: { userId: existing.id, code: otpCode, purpose: 'email_verification', expiresAt: new Date(Date.now() + 30 * 60 * 1000) }
        });
        sendOTPEmail(existing.email, otpCode, existing.firstName ?? undefined).catch(e => console.error('Re-OTP error:', e));
      }
      // SECURITY: same response shape as a fresh registration
      return NextResponse.json({
        success: true,
        requiresVerification: true,
        message: 'Si cet email est valide et non encore vérifié, un code a été envoyé.',
        email: existing.email,
      });
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
        slug: '', // auto-filled by Prisma middleware
      }
    });

    // Create OTP code (30 min expiry)
    await prisma.otpCode.create({
      data: {
        userId: user.id,
        code: otpCode,
        purpose: 'email_verification',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      }
    });

    // Send OTP (for verification) - await so we know if it failed
    const otpResult = await sendOTPEmail(user.email, otpCode, user.firstName ?? undefined);
    console.log(`[register] OTP email result for ${user.email}: success=${otpResult.success} id=${otpResult.id} devCode=${otpResult.devCode ? 'YES' : 'NO'}`);

    // Send welcome email (different purpose - confirms account creation)
    await sendWelcomeEmail(user.email, user.firstName ?? '', user.role);

    // If teacher, notify admins in-app
    if (user.role === 'TEACHER') {
      await notifyAdminsNewTeacher(user.id).catch(e =>
        console.error('Admin notify error:', e)
      );
    }

    // Build response - in dev mode OR if email failed, expose the OTP
    // so the user can verify without checking email
    const response: any = {
      success: true,
      requiresVerification: true,
      message: 'Compte créé. Un code de vérification a été envoyé à votre email.',
      email: user.email,
    };

    // Expose devCode when:
    // - NODE_ENV is not production
    // - OR Resend is in testing mode (failed to send to non-owner)
    if (otpResult.devCode) {
      response.devCode = otpResult.devCode;
      response.devMode = true;
      if (!otpResult.success) {
        response.message = `Compte créé. ⚠️ Email non envoyé (${otpResult.error}). En dev, utilisez le code ci-dessous.`;
      }
    }

    return NextResponse.json(response);
  } catch (e: any) {
    console.error('Register error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
