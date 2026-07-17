import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// POST /api/follows { teacherId } - toggle follow
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { teacherId } = await req.json();
  if (!teacherId) return NextResponse.json({ error: 'teacherId requis' }, { status: 400 });

  if (teacherId === user.id)
    return NextResponse.json({ error: 'Impossible de se suivre soi-même' }, { status: 400 });

  // Verify teacher exists
  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, role: 'TEACHER' },
    select: { id: true },
  });
  if (!teacher) return NextResponse.json({ error: 'Professeur introuvable' }, { status: 404 });

  // Check if already following
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: user.id, followingId: teacherId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    const count = await prisma.follow.count({ where: { followingId: teacherId } });
    return NextResponse.json({ following: false, followersCount: count });
  } else {
    await prisma.follow.create({
      data: { followerId: user.id, followingId: teacherId },
    });
    // Notify teacher
    await prisma.notification.create({
      data: {
        userId: teacherId,
        type: 'new_follower',
        title: 'Nouveau follower 👋',
        message: `${user.firstName || 'Un utilisateur'} ${user.lastName || ''} vous suit maintenant.`,
        link: `/profil/${user.id}`,
      },
    });
    const count = await prisma.follow.count({ where: { followingId: teacherId } });
    return NextResponse.json({ following: true, followersCount: count });
  }
}

// GET /api/follows?teacherId=xxx - check follow status
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const teacherId = req.nextUrl.searchParams.get('teacherId');

  if (!teacherId) return NextResponse.json({ error: 'teacherId requis' }, { status: 400 });

  const followersCount = await prisma.follow.count({ where: { followingId: teacherId } });
  let following = false;
  if (user) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: user.id, followingId: teacherId } },
    });
    following = !!follow;
  }
  return NextResponse.json({ following, followersCount });
}
