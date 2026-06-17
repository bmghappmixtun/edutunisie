import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });

    const otp = await prisma.otpCode.findFirst({
      where: { userId: user.id, purpose: 'email_verification', consumedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    if (!otp || otp.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Code expiré ou invalide' }, { status: 400 });
    }
    if (otp.attempts >= 5) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 1h.' }, { status: 429 });
    }
    if (otp.code !== code) {
      await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      return NextResponse.json({ error: 'Code incorrect' }, { status: 400 });
    }

    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { status: user.role === 'TEACHER' ? 'PENDING_APPROVAL' : 'ACTIVE', emailVerifiedAt: new Date() }
    });

    if (updated.status === 'ACTIVE') {
      const { token, expiresAt } = await createSession(user.id);
      await setSessionCookie(token, expiresAt);
    }

    return NextResponse.json({ success: true, status: updated.status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
