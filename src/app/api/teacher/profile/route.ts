import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Réservé aux enseignants' }, { status: 403 });
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true, email: true,
      bio: true, schoolName: true, schoolNameAr: true, governorate: true, diploma: true,
      teachingSubjects: true, teachingLevels: true, avatarUrl: true,
      phone: true, website: true
    }
  });

  return NextResponse.json(profile);
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Réservé aux enseignants' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const allowed = ['firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'bio', 'schoolName', 'schoolNameAr', 'governorate', 'diploma', 'avatarUrl', 'phone', 'website'];
    const updateData: any = {};
    for (const k of allowed) {
      if (body[k] !== undefined) updateData[k] = body[k]?.toString().trim() || null;
    }

    // Validate teachingSubjects/Levels - must be JSON arrays of strings
    if (body.teachingSubjects !== undefined) {
      let arr: string[] = [];
      if (Array.isArray(body.teachingSubjects)) arr = body.teachingSubjects.map((s: any) => String(s).trim()).filter(Boolean);
      else if (typeof body.teachingSubjects === 'string') {
        try { arr = JSON.parse(body.teachingSubjects); } catch { arr = body.teachingSubjects.split(',').map((s: string) => s.trim()).filter(Boolean); }
      }
      updateData.teachingSubjects = JSON.stringify(arr);
    }
    if (body.teachingLevels !== undefined) {
      let arr: string[] = [];
      if (Array.isArray(body.teachingLevels)) arr = body.teachingLevels.map((s: any) => String(s).trim()).filter(Boolean);
      else if (typeof body.teachingLevels === 'string') {
        try { arr = JSON.parse(body.teachingLevels); } catch { arr = body.teachingLevels.split(',').map((s: string) => s.trim()).filter(Boolean); }
      }
      updateData.teachingLevels = JSON.stringify(arr);
    }

    // Validation
    if (updateData.bio && updateData.bio.length > 1000) {
      return NextResponse.json({ error: 'La bio ne peut pas dépasser 1000 caractères' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      select: {
        id: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true, bio: true,
        schoolName: true, schoolNameAr: true, governorate: true, diploma: true,
        teachingSubjects: true, teachingLevels: true, avatarUrl: true,
        phone: true, website: true
      },
      data: updateData
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}