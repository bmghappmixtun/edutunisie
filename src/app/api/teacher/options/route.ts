export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const [subjects, classes, sections] = await Promise.all([
    prisma.subject.findMany({
      orderBy: { nameFr: 'asc' },
      select: { id: true, nameFr: true, nameAr: true, slug: true, icon: true, color: true },
    }),
    prisma.class.findMany({
      orderBy: { order: 'asc' },
      select: {
        id: true,
        nameFr: true,
        nameAr: true,
        slug: true,
        levelId: true,
        level: { select: { nameFr: true, slug: true } },
      },
    }),
    prisma.section.findMany({
      orderBy: { nameFr: 'asc' },
      select: {
        id: true,
        nameFr: true,
        nameAr: true,
        slug: true,
        classId: true,
        class: { select: { slug: true } },
      },
    }),
  ]);

  return NextResponse.json({
    subjects: subjects.map((s) => ({
      slug: s.slug,
      name: s.nameFr,
      nameAr: s.nameAr,
      icon: s.icon,
      color: s.color,
    })),
    classes: classes.map((c) => ({
      slug: c.slug,
      name: c.nameFr,
      nameAr: c.nameAr,
      levelSlug: c.level?.slug || '',
    })),
    sections: sections.map((s) => ({
      slug: s.slug,
      name: s.nameFr,
      nameAr: s.nameAr,
      classSlug: s.class?.slug || '',
    })),
  });
}
