/**
 * Forgot Password — Step 1: request a reset code
 *
 * Sends an OTP code to the user's email if the account exists.
 * Always returns the same response shape (no email enumeration).
 *
 * POST /api/auth/forgot-password
 *   { email: string }
 *   → { success: true, email: string, devCode?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidOrigin, isProduction } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { generateOTP, hashPassword } from '@/lib/auth';
import { sendOTPEmail } from '@/lib/email';

export const runtime = 'nodejs';

const RESET_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export async function POST(req: NextRequest) {
  if (isProduction() && !isValidOrigin(req)) {
    return NextResponse.json({ error: 'Origine non autorisée' }, { status: 403 });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const email = (body.email || '').toLowerCase().trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
  }

  // SECURITY: always return success shape to prevent email enumeration.
  // The actual work happens below only if the user exists.
  const genericResponse = { success: true, email };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // No user, but don't reveal that. Just return the generic shape.
    return NextResponse.json(genericResponse);
  }

  // Block password reset for accounts that are not yet verified
  // (no point resetting a password for an unverified account that can't log in)
  if (user.status === 'PENDING_OTP' || user.status === 'PENDING_APPROVAL' || user.status === 'SUSPENDED' || user.status === 'BANNED') {
    // Silent return — same shape
    return NextResponse.json(genericResponse);
  }

  // Invalidate any existing password_reset OTPs
  await prisma.otpCode.updateMany({
    where: { userId: user.id, purpose: 'password_reset', consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const code = generateOTP();
  await prisma.otpCode.create({
    data: {
      userId: user.id,
      code,
      purpose: 'password_reset',
      expiresAt: new Date(Date.now() + RESET_EXPIRY_MS),
    },
  });

  // Send the email (await so we can include devCode in dev mode)
  const result = await sendOTPEmail(user.email, code, user.firstName ?? undefined);

  return NextResponse.json({
    success: true,
    email: user.email,
    // dev code is included in dev / test mode for easy local testing
    ...(result.devCode ? { devCode: result.devCode } : {}),
  });
}
