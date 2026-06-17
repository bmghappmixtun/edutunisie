import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 });

    const existing = await prisma.newsletter.findUnique({ where: { email } });
    if (existing) {
      if (!existing.isActive) {
        await prisma.newsletter.update({ where: { email }, data: { isActive: true } });
        return NextResponse.json({ success: true, message: 'Réabonnement confirmé !' });
      }
      return NextResponse.json({ error: 'Déjà inscrit' }, { status: 409 });
    }

    await prisma.newsletter.create({ data: { email } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
