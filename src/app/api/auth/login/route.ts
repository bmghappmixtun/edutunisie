import { NextRequest, NextResponse } from 'next/server';
import { isValidOrigin, isProduction } from '@/lib/security';
import { rateLimit, getClientIp } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { createSession, setSessionCookie } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// SECURITY: account lockout thresholds
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: NextRequest) {
  // SECURITY: CSRF origin check (production only)
  if (isProduction() && !isValidOrigin(req)) {
    return NextResponse.json({ error: 'Origine non autorisée' }, { status: 403 });
  }

  try {
    // SECURITY: rate limit per IP
    const ip = getClientIp(req);
    const endpoint = 'login';
    const limit =
      endpoint === 'login'
        ? { max: 10, windowMs: 15 * 60 * 1000 }
        : { max: 5, windowMs: 60 * 60 * 1000 };
    const rl = rateLimit(ip, endpoint, limit.max, limit.windowMs);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Trop de tentatives. Réessayez dans ${Math.ceil(rl.resetIn / 60000)} minutes.` },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } },
      );
    }

    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // SECURITY: timing-attack protection — always run a bcrypt compare
    // even if the user doesn't exist (compare against a dummy hash).
    // This makes the response time independent of whether the email exists.
    const DUMMY_HASH = '$2a$12$L1vUcRW3YHN.Dqj3oQIc9.d7gO1sZxQfHj9kBrlcFbUkN2VU/LkVu';
    const passwordToCheck = user?.passwordHash || DUMMY_HASH;
    const valid = await bcrypt.compare(password, passwordToCheck);

    // SECURITY: account lockout check
    if (user && user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMin = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        {
          error: `Compte temporairement verrouillé suite à de nombreuses tentatives. Réessayez dans ${remainingMin} minute(s).`,
          code: 'ACCOUNT_LOCKED',
          retryAfter: Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000),
        },
        {
          status: 423,
          headers: {
            'Retry-After': String(Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000)),
          },
        },
      );
    }

    if (!user || !user.passwordHash || !valid) {
      // SECURITY: same error message and status — never reveal which field is wrong
      // SECURITY: increment failed login counter
      if (user) {
        const newCount = (user.failedLoginCount || 0) + 1;
        const shouldLock = newCount >= MAX_FAILED_ATTEMPTS;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginCount: shouldLock ? 0 : newCount,
            lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : user.lockedUntil,
            lastFailedLoginAt: new Date(),
          },
        });
        if (shouldLock) {
          return NextResponse.json(
            {
              error: `Trop de tentatives échouées. Compte verrouillé pendant ${Math.ceil(LOCKOUT_DURATION_MS / 60000)} minutes.`,
              code: 'ACCOUNT_LOCKED',
              retryAfter: Math.ceil(LOCKOUT_DURATION_MS / 1000),
            },
            {
              status: 423,
              headers: { 'Retry-After': String(Math.ceil(LOCKOUT_DURATION_MS / 1000)) },
            },
          );
        }
      }
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
    }

    // SECURITY: reset failed login counter on successful auth
    if (user.failedLoginCount > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      });
    }

    if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
      return NextResponse.json(
        { error: "Votre compte a été suspendu. Contactez l'administrateur." },
        { status: 403 },
      );
    }

    if (user.status === 'PENDING_APPROVAL') {
      return NextResponse.json(
        {
          error: "Votre compte enseignant est en attente d'approbation par l'administrateur.",
          code: 'PENDING_APPROVAL',
          status: user.status,
          role: user.role,
        },
        { status: 403 },
      );
    }

    if (user.status === 'PENDING_OTP') {
      return NextResponse.json(
        {
          error: 'Veuillez vérifier votre email avec le code OTP.',
          code: 'PENDING_OTP',
          status: user.status,
          role: user.role,
          email: user.email,
        },
        { status: 403 },
      );
    }

    const { token, expiresAt } = await createSession(
      user.id,
      req.headers.get('user-agent') || undefined,
    );
    await setSessionCookie(token, expiresAt);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        isVerifiedTeacher: user.isVerifiedTeacher,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
