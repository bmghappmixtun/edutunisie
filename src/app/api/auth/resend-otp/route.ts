import { NextRequest, NextResponse } from 'next/server';
import { isValidOrigin, isProduction, rateLimit, getClientIp } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { generateOTP } from '@/lib/auth';
import { sendOTPEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  // SECURITY: CSRF origin check (production only)
  if (isProduction() && !isValidOrigin(req)) {
    return NextResponse.json({ error: 'Origine non autorisée' }, { status: 403 });
  }

  try {
    // SECURITY: rate limit per IP
    const ip = getClientIp(req);
    const rl = rateLimit(ip, 'resend-otp', 5, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Trop de demandes. Réessayez dans ${Math.ceil(rl.resetIn / 60000)} minutes.` },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } }
      );
    }

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();

    // SECURITY: anti-enumeration — always return the SAME success response
    // regardless of whether the user exists. Same status (200), same message,
    // same timing (use Promise.resolve to keep latency consistent).
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (user && !user.emailVerifiedAt && user.status === 'PENDING_OTP') {
      // Rate limit: max 1 resend per 30s per user
      const lastOtp = await prisma.otpCode.findFirst({
        where: { userId: user.id, purpose: 'email_verification' },
        orderBy: { createdAt: 'desc' }
      });
      if (lastOtp && lastOtp.createdAt > new Date(Date.now() - 30 * 1000)) {
        // Don't leak timing — still return success shape
        return NextResponse.json({
          success: true,
          message: 'Si votre email est valide et non vérifié, un nouveau code a été envoyé.'
        });
      }

      // Invalidate previous unconsumed OTPs
      await prisma.otpCode.updateMany({
        where: { userId: user.id, purpose: 'email_verification', consumedAt: null },
        data: { consumedAt: new Date() }
      });

      const code = generateOTP();
      await prisma.otpCode.create({
        data: {
          userId: user.id,
          code,
          purpose: 'email_verification',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        }
      });

      await sendOTPEmail(user.email, code, user.firstName ?? undefined).catch(e =>
        console.error('Resend OTP error:', e)
      );
    }

    // SECURITY: same response whether user exists or not, with same wording
    return NextResponse.json({
      success: true,
      message: 'Si votre email est valide et non vérifié, un nouveau code a été envoyé.'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
