import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { id } = await params;

  try {
    const body = await req.json();
    const data: any = {};
    for (const k of ['nameFr', 'nameAr', 'classId']) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    if (body.slug) data.slug = body.slug.toLowerCase().trim();
    const section = await prisma.section.update({ where: { id }, data });
    return NextResponse.json({ success: true, section });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { id } = await params;

  const resourceCount = await prisma.resource.count({ where: { sectionId: id } });
  if (resourceCount > 0) {
    return NextResponse.json({
      error: `Impossible : ${resourceCount} ressource(s) utilisent cette section.`
    }, { status: 400 });
  }

  await prisma.section.delete({ where: { id } });
  return NextResponse.json({ success: true });
}