import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Test-only endpoint to retrieve latest OTP for an email
// Protected by SEED_TOKEN. Used by E2E tests only.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const email = req.nextUrl.searchParams.get('email');

  if (token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 });

  const otp = await prisma.otpCode.findFirst({
    where: { userId: user.id, purpose: 'email_verification', consumedAt: null },
    orderBy: { createdAt: 'desc' }
  });
  if (!otp) return NextResponse.json({ error: 'no otp' }, { status: 404 });

  return NextResponse.json({
    code: otp.code,
    expiresAt: otp.expiresAt,
    attempts: otp.attempts
  });
}