import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// PATCH /api/admin/catalog/subjects/[id] - update
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const data: any = {};
    for (const k of ['nameFr', 'nameAr', 'icon', 'color', 'order']) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    if (body.slug) data.slug = body.slug.toLowerCase().trim();

    const subject = await prisma.subject.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, subject });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/admin/catalog/subjects/[id] - delete
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { id } = await params;

  // Check if subject has resources
  const resourceCount = await prisma.resource.count({ where: { subjectId: id } });
  if (resourceCount > 0) {
    return NextResponse.json(
      {
        error: `Impossible : ${resourceCount} ressource(s) utilisent cette matière. Réassigniez-les d'abord.`,
      },
      { status: 400 },
    );
  }

  await prisma.subject.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
