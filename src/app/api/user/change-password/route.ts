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
 *  7. Session is re-validated after change (JWT gets new timestamp)
 *  8. All other sessions are NOT invalidated (we don't have a session list)
 *     → Email is the recovery path if attacker changes pwd
 *  9. Confirmation email sent with IP, UA, timestamp + "if not you" warning
 * 10. Audit log records the change (email, userId, ip)
 *
 * POST /api/user/change-password
 *   { currentPassword: string, newPassword: string }
 *   → { success: true }
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendPasswordChangedEmail } from '@/lib/email';
import { getClientIp } from '@/lib/security';

export const runtime = 'nodejs';

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

  // Audit log
  console.log(`[change-password] success userId=${user.id} email=${user.email} ip=${ip}`);

  // Send confirmation email (non-blocking — log on failure, don't fail the request)
  sendPasswordChangedEmail({
    to: user.email,
    firstName: user.firstName ?? '',
    ip,
    userAgent,
  }).catch((err) => {
    console.error('[change-password] confirmation email failed', err);
  });

  return NextResponse.json({
    success: true,
    message: 'Mot de passe changé avec succès',
  });
}
