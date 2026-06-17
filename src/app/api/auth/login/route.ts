import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
    }

    if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
      return NextResponse.json({ error: 'Votre compte a été suspendu. Contactez l\'administrateur.' }, { status: 403 });
    }

    if (user.status === 'PENDING_APPROVAL') {
      return NextResponse.json({ error: 'Votre compte enseignant est en attente d\'approbation par l\'administrateur.' }, { status: 403 });
    }

    if (user.status === 'PENDING_OTP') {
      return NextResponse.json({ error: 'Veuillez vérifier votre email avec le code OTP.' }, { status: 403 });
    }

    const { token, expiresAt } = await createSession(user.id, req.headers.get('user-agent') || undefined);
    await setSessionCookie(token, expiresAt);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id, email: user.email, role: user.role,
        firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl,
        isVerifiedTeacher: user.isVerifiedTeacher
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
