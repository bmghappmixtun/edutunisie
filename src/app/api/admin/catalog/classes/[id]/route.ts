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
    for (const k of ['nameFr', 'nameAr', 'levelId', 'order']) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    if (body.slug) data.slug = body.slug.toLowerCase().trim();
    const cls = await prisma.class.update({ where: { id }, data });
    return NextResponse.json({ success: true, class: cls });
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

  const resourceCount = await prisma.resource.count({ where: { classId: id } });
  if (resourceCount > 0) {
    return NextResponse.json({
      error: `Impossible : ${resourceCount} ressource(s) utilisent cette classe.`
    }, { status: 400 });
  }

  // Delete sections first
  await prisma.section.deleteMany({ where: { classId: id } });
  await prisma.class.delete({ where: { id } });
  return NextResponse.json({ success: true });
}