export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET /api/admin/catalog/subjects - list all subjects
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const subjects = await prisma.subject.findMany({
    orderBy: { nameFr: 'asc' },
    include: { _count: { select: { resources: true } } },
  });

  return NextResponse.json({ subjects });
}

// POST /api/admin/catalog/subjects - create
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { slug, nameFr, nameAr, icon, color, order } = body;

    if (!slug || !nameFr || !nameAr) {
      return NextResponse.json({ error: 'slug, nameFr, nameAr requis' }, { status: 400 });
    }

    const existing = await prisma.subject.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'Ce slug existe déjà' }, { status: 400 });
    }

    const subject = await prisma.subject.create({
      data: {
        slug: slug.toLowerCase().trim(),
        nameFr: nameFr.trim(),
        nameAr: nameAr.trim(),
        icon: icon || null,
        color: color || null,
        order: order ?? 0,
      },
    });

    return NextResponse.json({ success: true, subject });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
