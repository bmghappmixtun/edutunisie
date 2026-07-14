/**
 * Forgot Password — Step 2: verify the code and set a new password
 *
 * POST /api/auth/reset-password
 *   { email: string, code: string, newPassword: string }
 *   → { success: true }
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidOrigin, isProduction } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (isProduction() && !isValidOrigin(req)) {
    return NextResponse.json({ error: 'Origine non autorisée' }, { status: 403 });
  }

  let body: { email?: string; code?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const email = (body.email || '').toLowerCase().trim();
  const code = (body.code || '').trim();
  const newPassword = body.newPassword || '';

  if (!email || !code || !newPassword) {
    return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 });
  }
  if (newPassword.length > 128) {
    return NextResponse.json({ error: 'Mot de passe trop long' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: 'Email ou code invalide' }, { status: 400 });
  }

  // Find the latest unused OTP for password reset
  const otp = await prisma.otpCode.findFirst({
    where: { userId: user.id, purpose: 'password_reset', consumedAt: null },
    orderBy: { createdAt: 'desc' },
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

  // Valid — consume the code and update the password
  const passwordHash = await hashPassword(newPassword);

  // SECURITY: also invalidate any other pending OTPs for this user (in case of concurrent attacks)
  await prisma.otpCode.updateMany({
    where: { userId: user.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      // Reset lockout if user was locked out
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  return NextResponse.json({ success: true });
}
