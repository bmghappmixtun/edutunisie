export const dynamic = 'force-dynamic';

/**
 * Change Password — from the user's security settings page
 *
 * Authenticated endpoint (the user must be logged in).
 * Requires the current password to authorize the change.
 *
 * SECURITY MEASURES:
 *  1. Authentication required (user must be logged in)
 *  2. Status check — SUSPENDED/BANNED users cannot change password
 *  3. Current password verification (bcrypt)
 *  4. New password must differ from current (prevents accidental same-password)
 *  5. Password length 8-128 chars
 *  6. Rate limit: 3 changes per hour per user (prevents brute force / abuse)
 *  7. Confirmation email sent with IP, UA, timestamp + "if not you" warning
 *  8. **All other sessions for this user are invalidated** (anti-hijacking:
 *     if an attacker had a stolen cookie, they are kicked out on pwd change)
 *  9. The current session is kept (user keeps their own session)
 * 10. Email send result is returned in the response so the user knows
 *     if the confirmation actually went out
 * 11. Audit log records the change (email, userId, ip, invalidated count)
 *
 * POST /api/user/change-password
 *   { currentPassword: string, newPassword: string }
 *   → { success: true, emailSent: boolean, sessionsInvalidated: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendPasswordChangedEmail } from '@/lib/email';
import { getClientIp } from '@/lib/security';

export const runtime = 'nodejs';

const SESSION_COOKIE =
  process.env.NODE_ENV === 'production' ? '__Secure-examanet_session' : 'examanet_session';

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const RATE_LIMIT_MAX = 3; // 3 password changes per window
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// In-memory rate limit (per user). Resets on each cold start.
// For multi-instance setup, use Redis/Upstash.
const _changeAttempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = _changeAttempts.get(userId);
  if (!entry || entry.resetAt < now) {
    _changeAttempts.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') || 'Inconnu';

  // Rate limit per user (3 changes per hour)
  if (isRateLimited(session.id)) {
    console.log(`[change-password] rate limited userId=${session.id} ip=${ip}`);
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans 1 heure.' },
      { status: 429 },
    );
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const currentPassword = body.currentPassword || '';
  const newPassword = body.newPassword || '';

  // Input validation
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Le nouveau mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères` },
      { status: 400 },
    );
  }
  if (newPassword.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json({ error: 'Mot de passe trop long' }, { status: 400 });
  }
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "Le nouveau mot de passe doit être différent de l'actuel" },
      { status: 400 },
    );
  }

  // Load the user
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: 'Compte sans mot de passe (OAuth ?)' }, { status: 400 });
  }

  // Status check — blocked users cannot change password
  if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
    console.log(`[change-password] blocked ${user.status} userId=${user.id}`);
    return NextResponse.json({ error: 'Compte non autorisé' }, { status: 403 });
  }

  // Verify current password
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    console.log(`[change-password] wrong current password userId=${user.id} ip=${ip}`);
    return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 });
  }

  // Hash and update the new password
  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      // Reset any failed-login counter (good practice on a successful change)
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  // SECURITY: invalidate all other sessions for this user.
  // The current session (matched by token in cookie) is kept so the user
  // doesn't get logged out of the device they used to change the password.
  // Any stolen cookies / other devices are forced to re-authenticate.
  const currentToken = (await cookies()).get(SESSION_COOKIE)?.value;
  const invalidateResult = await prisma.session.deleteMany({
    where: {
      userId: user.id,
      ...(currentToken ? { NOT: { token: currentToken } } : {}),
    },
  });
  const sessionsInvalidated = invalidateResult.count;
  console.log(
    `[change-password] invalidated ${sessionsInvalidated} other session(s) for userId=${user.id}`,
  );

  // Audit log
  console.log(
    `[change-password] success userId=${user.id} email=${user.email} ip=${ip} sessionsInvalidated=${sessionsInvalidated}`,
  );

  // Send confirmation email — BLOCKING so we can report the status to the user.
  // Old behavior used .catch() which silently swallowed failures, leaving the
  // user thinking they got a confirmation email when they didn't.
  let emailSent = false;
  let emailError: string | null = null;
  try {
    const result = await sendPasswordChangedEmail({
      to: user.email,
      firstName: user.firstName ?? '',
      ip,
      userAgent,
    });
    emailSent = result.success;
    if (!result.success) {
      emailError = result.error || 'unknown error';
      console.error(
        `[change-password] confirmation email FAILED userId=${user.id} reason=${emailError}`,
      );
    }
  } catch (err: any) {
    emailError = err?.message || 'unknown error';
    console.error('[change-password] confirmation email threw', err);
  }

  return NextResponse.json({
    success: true,
    message: 'Mot de passe changé avec succès',
    emailSent,
    emailError,
    sessionsInvalidated,
  });
}
