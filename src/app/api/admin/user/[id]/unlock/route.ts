import { NextRequest, NextResponse } from 'next/server';
import { isValidOrigin, isProduction } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // SECURITY: CSRF origin check (production only)
  if (isProduction() && !isValidOrigin(req)) {
    return NextResponse.json({ error: 'Origine non autorisée' }, { status: 403 });
  }

  try {
    const me = await getCurrentUser();
    if (!me || me.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, role: true, status: true, lockedUntil: true, failedLoginCount: true }
    });
    if (!target) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Reset lockout state
    await prisma.user.update({
      where: { id: params.id },
      data: { failedLoginCount: 0, lockedUntil: null }
    });

    console.log(`[admin] ${me.email} unlocked account for ${target.email} (was: lockedUntil=${target.lockedUntil}, failed=${target.failedLoginCount})`);

    return NextResponse.json({
      success: true,
      message: `Compte ${target.email} déverrouillé.`
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
