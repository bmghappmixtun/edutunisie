import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET /api/user/account - full account info
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      bio: true,
      schoolName: true,
      governorate: true,
      diploma: true,
      teachingSubjects: true,
      teachingLevels: true,
      phone: true,
      website: true,
      preferredLang: true,
      themePref: true,
      notifyEmail: true,
      notifyInApp: true,
      createdAt: true,
      lastLoginAt: true,
      emailVerifiedAt: true,
    },
  });

  return NextResponse.json({ account });
}

// PATCH /api/user/account - update account
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const body = await req.json();
    const allowed = [
      'firstName',
      'lastName',
      'avatarUrl',
      'bio',
      'schoolName',
      'governorate',
      'diploma',
      'phone',
      'website',
      'preferredLang',
      'themePref',
      'notifyEmail',
      'notifyInApp',
    ];
    const data: any = {};
    for (const k of allowed) {
      if (body[k] !== undefined) data[k] = body[k];
    }

    // JSON fields
    if (body.teachingSubjects !== undefined) {
      let arr: string[] = [];
      if (Array.isArray(body.teachingSubjects)) arr = body.teachingSubjects;
      else if (typeof body.teachingSubjects === 'string') {
        try {
          arr = JSON.parse(body.teachingSubjects);
        } catch {
          arr = body.teachingSubjects
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
        }
      }
      data.teachingSubjects = JSON.stringify(arr);
    }
    if (body.teachingLevels !== undefined) {
      let arr: string[] = [];
      if (Array.isArray(body.teachingLevels)) arr = body.teachingLevels;
      else if (typeof body.teachingLevels === 'string') {
        try {
          arr = JSON.parse(body.teachingLevels);
        } catch {
          arr = body.teachingLevels
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
        }
      }
      data.teachingLevels = JSON.stringify(arr);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        schoolName: true,
        governorate: true,
        diploma: true,
        teachingSubjects: true,
        teachingLevels: true,
        phone: true,
        website: true,
        preferredLang: true,
        themePref: true,
        notifyEmail: true,
        notifyInApp: true,
      },
    });

    return NextResponse.json({ success: true, account: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/user/account - delete account
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (user.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Les admins ne peuvent pas supprimer leur compte ici' },
      { status: 403 },
    );
  }

  await prisma.user.delete({ where: { id: user.id } });
  return NextResponse.json({ success: true });
}
