import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Mots de passe requis' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères' }, { status: 400 });
    }

    const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fullUser?.passwordHash) {
      return NextResponse.json({ error: 'Compte sans mot de passe (OAuth ?)' }, { status: 400 });
    }

    const valid = await bcrypt.compare(currentPassword, fullUser.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash }
    });

    return NextResponse.json({ success: true, message: 'Mot de passe changé' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}