export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteFile } from '@/lib/storage';

export const runtime = 'nodejs';

/**
 * POST /api/admin/teachers/bulk-delete
 *
 * Bulk-delete TEACHER users (typically PENDING_OTP, PENDING_APPROVAL, etc.)
 * that the admin wants to remove permanently.
 *
 * SAFETY:
 * - Admin cannot delete themselves
 * - Admin role is always preserved
 * - boutiti.mehdi@gmail.com is NEVER deleted (hard-coded protection)
 * - Resources are TRANSFERRED to the current admin (NOT deleted) by default
 *   unless keepFiles=false explicitly chosen
 *
 * Body:
 *   { ids: string[], keepFiles?: boolean }
 *
 * Response:
 *   { ok: true, deleted: string[], transferred: number, deletedFiles: number, errors: string[] }
 */
const PROTECTED_EMAILS = new Set([
  'boutiti.mehdi@gmail.com', // ⚠️ SUPER ADMIN - NEVER DELETE
]);

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || me.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  let body: { ids?: string[]; keepFiles?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === 'string') : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: 'ids array is required and non-empty' }, { status: 400 });
  }
  if (ids.length > 200) {
    return NextResponse.json(
      { error: 'Trop de suppressions en une fois (max 200)' },
      { status: 400 },
    );
  }

  // keepFiles: default TRUE (safer — preserve by transferring to admin)
  const keepFiles = body.keepFiles !== false;

  // Fetch all targets
  const targets = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      firstName: true,
      lastName: true,
      _count: {
        select: { uploadedFiles: true, library: true, verificationFiles: true },
      },
    },
  });

  const errors: string[] = [];
  const deleted: string[] = [];
  const skipped: string[] = [];
  let totalResourcesTransferred = 0;
  let totalFilesDeleted = 0;

  for (const target of targets) {
    try {
      // SAFETY: skip self
      if (target.id === me.id) {
        skipped.push(`${target.email} (soi-même)`);
        continue;
      }
      // SAFETY: skip admins
      if (target.role === 'ADMIN') {
        skipped.push(`${target.email} (admin)`);
        continue;
      }
      // SAFETY: skip protected emails
      if (target.email && PROTECTED_EMAILS.has(target.email.toLowerCase())) {
        skipped.push(`${target.email} (protégé)`);
        continue;
      }
      // SAFETY: only delete TEACHER
      if (target.role !== 'TEACHER') {
        skipped.push(`${target.email} (rôle ${target.role})`);
        continue;
      }

      // Count resources before deletion
      const resources = await prisma.resource.findMany({
        where: { teacherId: target.id },
        select: { id: true, fileUrl: true },
      });
      const fileCount = resources.length;

      if (keepFiles) {
        // Transfer resources to the current admin (preserved + attributed to admin)
        if (fileCount > 0) {
          await prisma.resource.updateMany({
            where: { teacherId: target.id },
            data: { teacherId: me.id },
          });
          totalResourcesTransferred += fileCount;
        }
      } else {
        // Hard delete: cleanup blob storage in background
        if (fileCount > 0) {
          totalFilesDeleted += fileCount;
          // Don't block the response on blob cleanup
          Promise.all(
            resources.map((r) =>
              deleteFile(r.fileUrl).catch((e) => console.error('File delete error:', e)),
            ),
          ).catch(() => {});
        }
      }

      // Clean up FK dependencies that don't have onDelete: Cascade
      await prisma.comment.deleteMany({ where: { userId: target.id } });
      await prisma.rating.deleteMany({ where: { userId: target.id } });
      await prisma.view.deleteMany({ where: { userId: target.id } });
      await prisma.download.deleteMany({ where: { userId: target.id } });
      await prisma.report.deleteMany({ where: { userId: target.id } });

      // Delete the user (cascade handles OtpCode, Notification, TeacherInvitation,
      // TeacherFile, Conversation, etc. via the schema's onDelete: Cascade)
      await prisma.user.delete({ where: { id: target.id } });
      deleted.push(target.email || target.id);
    } catch (e: any) {
      console.error(`❌ Bulk delete error for ${target.email}:`, e);
      errors.push(`${target.email || target.id}: ${e.message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    deleted,
    skipped,
    errors,
    totalRequested: ids.length,
    totalDeleted: deleted.length,
    totalSkipped: skipped.length,
    totalErrors: errors.length,
    totalResourcesTransferred,
    totalFilesDeleted,
  });
}
