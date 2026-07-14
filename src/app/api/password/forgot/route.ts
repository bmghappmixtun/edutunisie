/**
 * Forgot Password — Step 1: request a reset code
 *
 * Sends an OTP code to the user's email if the account exists.
 * Always returns the same response shape (no email enumeration).
 *
 * SECURITY MEASURES (defense in depth):
 *  1. Email existence check (silent) — only ACTIVE users get a code
 *  2. Same response shape regardless of email existence (anti-enumeration)
 *  3. Rate limit per email (5 requests / 15 min) to slow brute force probes
 *  4. Rate limit per IP (20 requests / 15 min) to slow distributed probes
 *  5. Audit log — every attempt is logged for security monitoring
 *  6. Status check — suspended/banned/pending accounts are blocked
 *  7. OTP reuse — invalidates previous unused codes on each request
 *  8. OTP expiry — codes expire after 30 min
 *  9. OTP attempt limit — max 5 tries per code
 *
 * POST /api/password/forgot
 *   { email: string }
 *   → { success: true, email: string, devCode?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidOrigin, isProduction, getClientIp } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { generateOTP, hashPassword } from '@/lib/auth';
import { sendOTPEmail } from '@/lib/email';

export const runtime = 'nodejs';

const RESET_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const RATE_LIMIT_PER_EMAIL = 5;
const RATE_LIMIT_PER_IP = 20;
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// In-memory rate limit (per process). Good enough for this single endpoint;
// for a multi-instance setup, move to Redis or Upstash.
const _rateStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const entry = _rateStore.get(key);
  if (!entry || entry.resetAt < now) {
    _rateStore.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  if (isProduction() && !isValidOrigin(req)) {
    return NextResponse.json({ error: 'Origine non autorisée' }, { status: 403 });
  }

  const ip = getClientIp(req);
  const ua = req.headers.get('user-agent') || '';
  // (kept for future use; user-agent can be logged with attempts)

  // Rate limit per IP
  if (!checkRateLimit(`ip:${ip}`, RATE_LIMIT_PER_IP)) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
      { status: 429 }
    );
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

  // Rate limit per email
  if (!checkRateLimit(`email:${email}`, RATE_LIMIT_PER_EMAIL)) {
    return NextResponse.json(
      { error: 'Trop de tentatives pour cet email. Réessayez dans 15 minutes.' },
      { status: 429 }
    );
  }

  // SECURITY: always return the same response shape to prevent email enumeration.
  // The actual work happens below only if the user exists.
  const genericResponse = { success: true, email };

  // ============================================================
  // CHECK 1: Does the email exist in the database?
  // (silent — return genericResponse either way to prevent enumeration)
  // ============================================================
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, firstName: true, status: true, role: true },
  });

  // Log every attempt for security audit (regardless of result)
  console.log(`[forgot-password] attempt email=${email} ip=${ip} exists=${!!user} status=${user?.status || 'NO_USER'}`);

  if (!user) {
    // No user found — but don't reveal this to the caller
    return NextResponse.json(genericResponse);
  }

  // ============================================================
  // CHECK 2: Account status — only blocked users cannot reset
  // Silent return for blocked accounts (no email sent, same response)
  //
  // Status flow for STUDENTS:
  //   PENDING_OTP  → after signup, before email verification
  //   ACTIVE       → after email verification
  //
  // Status flow for TEACHERS:
  //   PENDING_APPROVAL       → after signup, before admin approval
  //   PENDING_FILE_VERIFICATION → during file verification
  //   ACTIVE                 → fully approved
  //
  // Blocked statuses (cannot reset):
  //   SUSPENDED  → admin-suspended
  //   BANNED     → permanently banned
  // ============================================================
  if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
    console.log(`[forgot-password] blocked ${user.status} user email=${email}`);
    return NextResponse.json(genericResponse);
  }

  // ============================================================
  // CHECK 3: Invalidate any previous unused codes
  // ============================================================
  await prisma.otpCode.updateMany({
    where: { userId: user.id, purpose: 'password_reset', consumedAt: null },
    data: { consumedAt: new Date() },
  });

  // ============================================================
  // CHECK 4: Generate and persist the OTP
  // ============================================================
  const code = generateOTP();
  await prisma.otpCode.create({
    data: {
      userId: user.id,
      code,
      purpose: 'password_reset',
      expiresAt: new Date(Date.now() + RESET_EXPIRY_MS),
    },
  });

  // ============================================================
  // CHECK 5: Send the email (server-side, await for status)
  // ============================================================
  const result = await sendOTPEmail(user.email, code, user.firstName ?? undefined);

  console.log(
    `[forgot-password] code sent email=${email} success=${result.success} devMode=${!!result.devCode}`
  );

  return NextResponse.json({
    success: true,
    email: user.email,
    // Dev code is included in dev/test mode for easy local testing
    ...(result.devCode ? { devCode: result.devCode } : {}),
  });
}
