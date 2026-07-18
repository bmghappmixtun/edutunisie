export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET /api/conversations - list user's conversations
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ studentId: user.id }, { teacherId: user.id }],
    },
    orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      teacher: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, schoolName: true },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { content: true, senderId: true, createdAt: true },
      },
    },
  });

  // Count unread for each
  const convsWithUnread = await Promise.all(
    conversations.map(async (c) => {
      const unread = await prisma.message.count({
        where: { conversationId: c.id, isRead: false, senderId: { not: user.id } },
      });
      return { ...c, unread };
    }),
  );

  return NextResponse.json({ conversations: convsWithUnread });
}

// POST /api/conversations { teacherId } - create or get conversation (student starts with teacher)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { teacherId } = await req.json();
  if (!teacherId) return NextResponse.json({ error: 'teacherId requis' }, { status: 400 });

  if (user.role === 'TEACHER' || user.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Seuls les élèves peuvent initier une conversation' },
      { status: 403 },
    );
  }

  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, role: 'TEACHER' },
    select: { id: true },
  });
  if (!teacher) return NextResponse.json({ error: 'Professeur introuvable' }, { status: 404 });

  // Find or create
  let conv = await prisma.conversation.findUnique({
    where: { studentId_teacherId: { studentId: user.id, teacherId } },
  });

  if (!conv) {
    conv = await prisma.conversation.create({
      data: { studentId: user.id, teacherId },
    });
  }

  return NextResponse.json({ conversation: conv });
}
