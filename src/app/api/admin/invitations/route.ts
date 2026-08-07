export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me || me.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const status = sp.get('status'); // PENDING|SENT|CLICKED|ACTIVATED|EXPIRED|CANCELLED
    const teacherId = sp.get('teacherId');
    const page = Math.max(1, parseInt(sp.get('page') || '1'));
    const pageSize = Math.min(100, parseInt(sp.get('size') || '50'));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    // Per user rule (2026-08-07): the CLICKED filter matches invitations
    // where the teacher clicked at least once, regardless of current
    // status. This is the same heuristic used in the admin page UI.
    if (status === 'CLICKED') {
      where.clickCount = { gt: 0 };
    } else if (status) {
      where.status = status;
    }
    if (teacherId) where.teacherId = teacherId;

    const [invitations, total] = await Promise.all([
      prisma.teacherInvitation.findMany({
        where,
        take: pageSize,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              _count: { select: { uploadedFiles: true } },
            },
          },
          invitedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.teacherInvitation.count({ where }),
    ]);

    // Stats by status — per user rule (2026-08-07): the CLICKED stat counts
    // unique teachers who clicked at least once, not the count of
    // invitations currently in the CLICKED state. (Old behavior was always
    // 0 because any teacher who clicked eventually activated and moved to
    // ACTIVATED.) We also expose the total click events separately.
    const [stats, clickedCount, totalClicksAgg] = await Promise.all([
      prisma.teacherInvitation.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.teacherInvitation.count({
        where: { clickCount: { gt: 0 } },
      }),
      prisma.teacherInvitation.aggregate({
        _sum: { clickCount: true },
      }),
    ]);

    const statsMap: Record<string, number> = {};
    stats.forEach((s: any) => {
      statsMap[s.status] = s._count.status;
    });
    // Override CLICKED with the unique-click count
    statsMap.CLICKED = clickedCount;

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        id: inv.id,
        token: inv.token,
        email: inv.email,
        status: inv.status,
        createdAt: inv.createdAt,
        emailSentAt: inv.emailSentAt,
        linkClickedAt: inv.linkClickedAt,
        activatedAt: inv.activatedAt,
        cancelledAt: inv.cancelledAt,
        expiresAt: inv.expiresAt,
        clickCount: inv.clickCount,
        clickIpAddress: inv.clickIpAddress,
        activateIpAddress: inv.activateIpAddress,
        customMessage: inv.customMessage,
        teacher: inv.teacher,
        invitedBy: inv.invitedBy,
      })),
      total,
      page,
      pageSize,
      stats: statsMap,
      totalClickEvents: totalClicksAgg._sum.clickCount || 0,
    });
  } catch (e: any) {
    console.error('invitations GET error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
