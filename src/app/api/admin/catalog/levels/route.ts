import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const levels = await prisma.level.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { classes: true } } }
  });

  return NextResponse.json({ levels });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  try {
    const { slug, nameFr, nameAr, order } = await req.json();
    if (!slug || !nameFr || !nameAr) {
      return NextResponse.json({ error: 'slug, nameFr, nameAr requis' }, { status: 400 });
    }
    const existing = await prisma.level.findUnique({ where: { slug } });
    if (existing) return NextResponse.json({ error: 'Ce slug existe déjà' }, { status: 400 });

    const level = await prisma.level.create({
      data: {
        slug: slug.toLowerCase().trim(),
        nameFr: nameFr.trim(),
        nameAr: nameAr.trim(),
        order: order ?? 0
      }
    });
    return NextResponse.json({ success: true, level });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}