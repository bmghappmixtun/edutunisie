import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const classes = await prisma.class.findMany({
    orderBy: { order: 'asc' },
    include: {
      level: { select: { nameFr: true, slug: true } },
      _count: { select: { resources: true, sections: true } },
    },
  });

  return NextResponse.json({ classes });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  try {
    const { slug, nameFr, nameAr, levelId, order } = await req.json();
    if (!slug || !nameFr || !nameAr || !levelId) {
      return NextResponse.json({ error: 'slug, nameFr, nameAr, levelId requis' }, { status: 400 });
    }

    const existing = await prisma.class.findUnique({ where: { slug } });
    if (existing) return NextResponse.json({ error: 'Ce slug existe déjà' }, { status: 400 });

    const cls = await prisma.class.create({
      data: {
        slug: slug.toLowerCase().trim(),
        nameFr: nameFr.trim(),
        nameAr: nameAr.trim(),
        levelId,
        order: order ?? 0,
      },
    });
    return NextResponse.json({ success: true, class: cls });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
