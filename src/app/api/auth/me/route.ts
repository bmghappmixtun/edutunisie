export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      isVerifiedTeacher: user.isVerifiedTeacher,
      governorate: user.governorate,
      classLevel: user.classLevel,
      teachingSubjects: user.teachingSubjects,
      bio: user.bio,
      schoolName: user.schoolName,
    },
  });
}
