export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users/bulk
 *
 * Perform a bulk action on multiple users at once.
 *
 * Body: {
 *   userIds: string[],
 *   action: 'suspend' | 'activate' | 'verify' | 'unverify' | 'delete' | 'ban'
 * }
 *
 * Constraints:
 *   - Only ADMIN role can perform bulk actions
 *   - Cannot act on other ADMIN accounts (returns 403 for the whole batch)
 *   - Delete cascades to all user data (resources, comments, etc.)
 *   - Returns { success, succeeded, failed, errors }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MAX_BATCH = 100;

export async function POST(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  let body: { userIds?: string[]; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
  }

  const userIds = Array.isArray(body.userIds) ? body.userIds : [];
  const action = body.action;

  if (userIds.length === 0) {
    return NextResponse.json({ error: 'Aucun utilisateur sélectionné' }, { status: 400 });
  }
  if (userIds.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `Maximum ${MAX_BATCH} utilisateurs par lot (reçu: ${userIds.length})` },
      { status: 400 },
    );
  }

  const validActions = ['suspend', 'activate', 'verify', 'unverify', 'delete', 'ban'];
  if (!action || !validActions.includes(action)) {
    return NextResponse.json(
      { error: `Action invalide. Attendu: ${validActions.join(', ')}` },
      { status: 400 },
    );
  }

  // Get the targets and check none are admins
  const targets = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      role: true,
      status: true,
      isVerifiedTeacher: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  const foundIds = new Set(targets.map((t) => t.id));
  const missingIds = userIds.filter((id) => !foundIds.has(id));

  const adminTargets = targets.filter((t) => t.role === 'ADMIN');
  if (adminTargets.length > 0) {
    return NextResponse.json(
      {
        error: 'Action refusée',
        message: `${adminTargets.length} administrateur(s) dans la sélection. Action impossible sur les comptes admin.`,
        adminIds: adminTargets.map((a) => a.id),
      },
      { status: 403 },
    );
  }

  // Execute the action per target
  const results: { id: string; name: string; success: boolean; error?: string }[] = [];
  const selfIds: string[] = []; // admin acting on themselves

  for (const target of targets) {
    try {
      if (target.id === admin.id) {
        selfIds.push(target.id);
        results.push({
          id: target.id,
          name: target.email,
          success: false,
          error: 'Vous ne pouvez pas vous modifier vous-même',
        });
        continue;
      }
      const name = `${target.firstName || ''} ${target.lastName || ''}`.trim() || target.email;
      switch (action) {
        case 'suspend':
          if (target.status === 'SUSPENDED') {
            results.push({ id: target.id, name, success: true, error: 'Déjà suspendu' });
            continue;
          }
          await prisma.user.update({ where: { id: target.id }, data: { status: 'SUSPENDED' } });
          break;
        case 'activate':
          if (target.status === 'ACTIVE') {
            results.push({ id: target.id, name, success: true, error: 'Déjà actif' });
            continue;
          }
          await prisma.user.update({ where: { id: target.id }, data: { status: 'ACTIVE' } });
          break;
        case 'verify':
          await prisma.user.update({ where: { id: target.id }, data: { isVerifiedTeacher: true } });
          break;
        case 'unverify':
          await prisma.user.update({
            where: { id: target.id },
            data: { isVerifiedTeacher: false },
          });
          break;
        case 'ban':
          await prisma.user.update({ where: { id: target.id }, data: { status: 'BANNED' } });
          break;
        case 'delete':
          // Cascade delete all related data
          await deleteUserAndCascade(target.id);
          break;
      }
      results.push({ id: target.id, name, success: true });
    } catch (e) {
      results.push({
        id: target.id,
        name: target.email,
        success: false,
        error: e instanceof Error ? e.message : 'Erreur',
      });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    success: failed === 0,
    action,
    total: userIds.length,
    succeeded,
    failed,
    missing: missingIds.length,
    results,
    selfBlocked: selfIds.length,
  });
}

/**
 * Delete a user and cascade to all their data.
 * Mirrors the cascade rules in DeleteUserButton.
 */
async function deleteUserAndCascade(userId: string) {
  await prisma.$transaction(async (tx) => {
    // 1. Resources (teacher or uploader)
    const resources = await tx.resource.findMany({
      where: { teacherId: userId },
      select: { id: true },
    });
    const resourceIds = resources.map((r) => r.id);
    if (resourceIds.length > 0) {
      await tx.comment.deleteMany({ where: { resourceId: { in: resourceIds } } });
      await tx.rating.deleteMany({ where: { resourceId: { in: resourceIds } } });
      await tx.favorite.deleteMany({ where: { resourceId: { in: resourceIds } } });
      await tx.view.deleteMany({ where: { resourceId: { in: resourceIds } } });
      await tx.download.deleteMany({ where: { resourceId: { in: resourceIds } } });
      await tx.share.deleteMany({ where: { resourceId: { in: resourceIds } } });
      await tx.report.deleteMany({ where: { resourceId: { in: resourceIds } } });
      await tx.resource.deleteMany({ where: { id: { in: resourceIds } } });
    }

    // 2. Teacher library files
    await tx.teacherFile.deleteMany({ where: { teacherId: userId } });

    // 3. Other relations
    await tx.notification.deleteMany({ where: { userId } });
    await tx.comment.deleteMany({ where: { userId } });
    await tx.rating.deleteMany({ where: { userId } });
    await tx.favorite.deleteMany({ where: { userId } });
    await tx.view.deleteMany({ where: { userId } });
    await tx.download.deleteMany({ where: { userId } });
    await tx.share.deleteMany({ where: { userId } });
    await tx.report.deleteMany({ where: { userId } });
    await tx.otpCode.deleteMany({ where: { userId } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.message.deleteMany({ where: { senderId: userId } });
    // Delete conversations where user is a participant (also covered by cascade)
    await tx.conversation.deleteMany({
      where: { OR: [{ studentId: userId }, { teacherId: userId }] },
    });

    // 4. ContactMessage has no userId (just name/email of visitor)
    //    No cascade needed - contact messages are anonymous

    // 5. Finally, the user
    await tx.user.delete({ where: { id: userId } });
  });
}
