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
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });

  try {
    const body = await req.json();
    const allowed = [
      'firstName', 'lastName', 'email', 'bio', 'schoolName', 'governorate', 'diploma',
      'avatarUrl', 'phone', 'website', 'isVerifiedTeacher', 'role', 'status'
    ];
    const updateData: any = {};
    for (const k of allowed) {
      if (body[k] !== undefined) updateData[k] = body[k];
    }

    // JSON fields
    if (body.teachingSubjects !== undefined) {
      let arr: string[] = [];
      if (Array.isArray(body.teachingSubjects)) arr = body.teachingSubjects;
      else if (typeof body.teachingSubjects === 'string') {
        try { arr = JSON.parse(body.teachingSubjects); } catch { arr = body.teachingSubjects.split(',').map((s: string) => s.trim()).filter(Boolean); }
      }
      updateData.teachingSubjects = JSON.stringify(arr);
    }
    if (body.teachingLevels !== undefined) {
      let arr: string[] = [];
      if (Array.isArray(body.teachingLevels)) arr = body.teachingLevels;
      else if (typeof body.teachingLevels === 'string') {
        try { arr = JSON.parse(body.teachingLevels); } catch { arr = body.teachingLevels.split(',').map((s: string) => s.trim()).filter(Boolean); }
      }
      updateData.teachingLevels = JSON.stringify(arr);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true, email: true, firstName: true, lastName: true, role: true, status: true,
        bio: true, schoolName: true, governorate: true, diploma: true,
        teachingSubjects: true, teachingLevels: true, isVerifiedTeacher: true,
        avatarUrl: true, phone: true, website: true
      }
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { id } = await params;
  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, firstName: true, lastName: true, role: true, status: true,
      bio: true, schoolName: true, governorate: true, diploma: true,
      teachingSubjects: true, teachingLevels: true, isVerifiedTeacher: true,
      avatarUrl: true, phone: true, website: true, createdAt: true, lastLoginAt: true
    }
  });
  if (!target) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });
  return NextResponse.json(target);
}