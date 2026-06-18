import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOTP } from '@/lib/auth';
import { sendOTPEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });

    if (user.emailVerifiedAt) {
      return NextResponse.json({ error: 'Cet email est déjà vérifié' }, { status: 400 });
    }

    // Rate limit: max 1 resend per 30s
    const lastOtp = await prisma.otpCode.findFirst({
      where: { userId: user.id, purpose: 'email_verification' },
      orderBy: { createdAt: 'desc' }
    });
    if (lastOtp && lastOtp.createdAt > new Date(Date.now() - 30 * 1000)) {
      return NextResponse.json({
        error: 'Veuillez patienter 30 secondes avant de demander un nouveau code.'
      }, { status: 429 });
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
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      }
    });

    await sendOTPEmail(user.email, code, user.firstName ?? undefined).catch(e =>
      console.error('Resend OTP error:', e)
    );

    return NextResponse.json({ success: true, message: 'Nouveau code envoyé' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}