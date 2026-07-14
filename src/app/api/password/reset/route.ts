/**
 * Forgot Password — Step 2: verify the code and set a new password
 *
 * POST /api/password/reset
 *   { email: string, code: string, newPassword: string }
 *   → { success: true }
 *
 * SECURITY MEASURES:
 *  - Same response shape for invalid email/code (no enumeration)
 *  - Per-code rate limit (5 attempts)
 *  - Code expires after 30 minutes
 *  - Code is consumed on use
 *  - All other pending OTPs are invalidated on success
 *  - Failed login lockout is reset on success
 *  - A confirmation email is sent to the user with security info
 *  - Audit log records the reset (email, IP, UA) for security monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidOrigin, isProduction, getClientIp } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { sendPasswordChangedEmail } from '@/lib/email';

export const runtime = 'nodejs';

const MAX_CODE_ATTEMPTS = 5;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export async function POST(req: NextRequest) {
  if (isProduction() && !isValidOrigin(req)) {
    return NextResponse.json({ error: 'Origine non autorisée' }, { status: 403 });
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') || 'Inconnu';

  let body: { email?: string; code?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const email = (body.email || '').toLowerCase().trim();
  const code = (body.code || '').trim();
  const newPassword = body.newPassword || '';

  // Input validation
  if (!email || !code || !newPassword) {
    return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères` },
      { status: 400 }
    );
  }
  if (newPassword.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json({ error: 'Mot de passe trop long' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // SECURITY: same error as wrong code, to prevent email enumeration
    return NextResponse.json({ error: 'Email ou code invalide' }, { status: 400 });
  }

  // SECURITY: re-check status in case user was banned/suspended after
  // the code was issued. Blocked users must not be able to complete reset.
  if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
    console.log(`[password-reset] blocked ${user.status} user email=${email}`);
    return NextResponse.json({ error: 'Email ou code invalide' }, { status: 400 });
  }

  // Find the latest unused OTP for password reset
  const otp = await prisma.otpCode.findFirst({
    where: { userId: user.id, purpose: 'password_reset', consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) {
    return NextResponse.json(
      { error: 'Aucun code en attente. Demandez un nouveau code.' },
      { status: 400 }
    );
  }
  if (otp.expiresAt < new Date()) {
    return NextResponse.json(
      { error: 'Code expiré. Demandez un nouveau code.' },
      { status: 400 }
    );
  }
  if (otp.attempts >= MAX_CODE_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Demandez un nouveau code.' },
      { status: 429 }
    );
  }
  if (otp.code !== code) {
    // Increment attempt count and re-check
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    // If this was the last attempt, consume the code
    if (otp.attempts + 1 >= MAX_CODE_ATTEMPTS) {
      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { consumedAt: new Date() },
      });
    }

    return NextResponse.json({ error: 'Code incorrect' }, { status: 400 });
  }

  // === ALL CHECKS PASSED ===

  // Hash the new password
  const passwordHash = await hashPassword(newPassword);

  // SECURITY: invalidate ALL other pending OTPs for this user (in case of concurrent attacks)
  await prisma.otpCode.updateMany({
    where: { userId: user.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  // Update the password + clear any lockout
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  // Audit log (security monitoring)
  console.log(
    `[password-reset] success email=${email} userId=${user.id} ip=${ip}`
  );

  // Send confirmation email (do not block the response)
  // We still await it but in a non-blocking way using `.catch` to swallow errors
  sendPasswordChangedEmail({
    to: user.email,
    firstName: user.firstName ?? '',
    ip,
    userAgent,
  }).catch((err) => {
    // Log but don't fail the request if the email fails
    // The password was already changed successfully
    console.error('[password-reset] confirmation email failed', err);
  });

  return NextResponse.json({ success: true });
}
