import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const { newEmail, password } = await req.json();
    if (!newEmail || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    // Verify password
    const bcrypt = await import('bcryptjs');
    const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fullUser?.passwordHash) {
      return NextResponse.json({ error: 'Compte sans mot de passe' }, { status: 400 });
    }
    const valid = await bcrypt.compare(password, fullUser.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 400 });
    }

    // Check if email already used
    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { email: newEmail, emailVerifiedAt: null },
    });

    return NextResponse.json({
      success: true,
      message: 'Email changé. Vérifiez votre nouvelle adresse.',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
