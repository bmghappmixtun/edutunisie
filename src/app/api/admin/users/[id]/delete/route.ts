import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteFile } from '@/lib/storage';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
  if (target.role === 'ADMIN') {
    return NextResponse.json({ error: 'Impossible de supprimer un administrateur' }, { status: 403 });
  }
  if (target.id === user.id) {
    return NextResponse.json({ error: 'Impossible de vous supprimer vous-même' }, { status: 403 });
  }

  // Parse options from request body
  let keepFiles = false;
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json();
      keepFiles = body.keepFiles === true;
    } else {
      const formData = await req.formData();
      keepFiles = formData.get('keepFiles') === 'true';
    }
  } catch {
    // default to false (delete everything)
    keepFiles = false;
  }

  try {
    const teacherResources = await prisma.resource.findMany({
      where: { teacherId: id },
      select: { id: true, fileKey: true, fileUrl: true, title: true }
    });

    // Clean up foreign-key dependencies that don't have onDelete: Cascade in the schema
    // (Comment, Rating, View, Download, Report). This prevents FK constraint violations
    // when deleting a user that has interacted with the platform.
    await prisma.comment.deleteMany({ where: { userId: id } });
    await prisma.rating.deleteMany({ where: { userId: id } });
    await prisma.view.deleteMany({ where: { userId: id } });
    await prisma.download.deleteMany({ where: { userId: id } });
    await prisma.report.deleteMany({ where: { userId: id } });

    if (keepFiles) {
      // Transfer resources to the admin who's deleting
      // Keep them visible but now attributed to admin
      await prisma.resource.updateMany({
        where: { teacherId: id },
        data: { teacherId: user.id }
      });

      // Resources that the user authored are no longer theirs (transferred above).
      // Resources that the user previously approved (approvedById is nullable, SetNull).
      await prisma.user.delete({ where: { id } });

      return NextResponse.json({
        success: true,
        message: `Utilisateur supprimé. ${teacherResources.length} ressource(s) transférée(s) à votre compte.`,
        transferredResources: teacherResources.length,
      });
    } else {
      // Hard delete everything
      await prisma.user.delete({ where: { id } });

      // Delete files from blob storage in background
      Promise.all(
        teacherResources.map(r => deleteFile(r.fileUrl).catch(e => console.error('File delete error:', e)))
      ).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Utilisateur et ${teacherResources.length} ressource(s) supprimé(s) définitivement`,
        deletedResources: teacherResources.length,
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}