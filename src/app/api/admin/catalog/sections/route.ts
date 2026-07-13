import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const sections = await prisma.section.findMany({
    orderBy: [{ class: { order: 'asc' } }, { nameFr: 'asc' }],
    include: {
      class: { select: { nameFr: true, slug: true, } },
      _count: { select: { resources: true } }
    }
  });

  return NextResponse.json({ sections });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  try {
    const { slug, nameFr, nameAr, classId } = await req.json();
    if (!slug || !nameFr || !nameAr || !classId) {
      return NextResponse.json({ error: 'slug, nameFr, nameAr, classId requis' }, { status: 400 });
    }

    const section = await prisma.section.create({
      data: {
        slug: slug.toLowerCase().trim(),
        nameFr: nameFr.trim(),
        nameAr: nameAr.trim(),
        classId
      }
    });
    return NextResponse.json({ success: true, section });
  } catch (e: any) {
    if (e.message?.includes('Unique')) {
      return NextResponse.json({ error: 'Cette section existe déjà pour cette classe' }, { status: 400 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}