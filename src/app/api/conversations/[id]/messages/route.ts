export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET /api/conversations/[id]/messages - list messages
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;

  // Verify user is part of conversation
  const conv = await prisma.conversation.findFirst({
    where: {
      id,
      OR: [{ studentId: user.id }, { teacherId: user.id }],
    },
  });
  if (!conv) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  });

  // Mark as read
  await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({
    messages,
    conversation: conv,
  });
}

// POST /api/conversations/[id]/messages { content } - send message
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const { content } = await req.json();

  if (!content || !content.trim())
    return NextResponse.json({ error: 'Message vide' }, { status: 400 });
  if (content.length > 2000)
    return NextResponse.json({ error: 'Message trop long (max 2000)' }, { status: 400 });

  // Verify user is part of conversation
  const conv = await prisma.conversation.findFirst({
    where: {
      id,
      OR: [{ studentId: user.id }, { teacherId: user.id }],
    },
  });
  if (!conv) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      senderId: user.id,
      content: content.trim(),
    },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  });

  // Update conversation lastMessageAt
  await prisma.conversation.update({
    where: { id },
    data: { lastMessageAt: new Date() },
  });

  // Notify the other party
  const otherUserId = user.id === conv.studentId ? conv.teacherId : conv.studentId;
  await prisma.notification.create({
    data: {
      userId: otherUserId,
      type: 'new_message',
      title: 'Nouveau message 💬',
      message: `${user.firstName || 'Utilisateur'}: ${content.substring(0, 80)}${content.length > 80 ? '...' : ''}`,
      link: `/messages/${id}`,
    },
  });

  return NextResponse.json({ message });
}
