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

  try {
    // Cascade: delete user's resources, files, comments, ratings, etc.
    // First, get all resource files to delete from storage
    const resources = await prisma.resource.findMany({
      where: { teacherId: id },
      select: { fileKey: true, fileUrl: true }
    });

    // Delete the user (cascading deletes are handled by Prisma schema)
    await prisma.user.delete({ where: { id } });

    // Cleanup: delete files from blob storage in background
    Promise.all(
      resources.map(r => deleteFile(r.fileUrl).catch(e => console.error('File delete error:', e)))
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Utilisateur ${target.firstName} ${target.lastName} supprimé définitivement`,
      deletedUser: { id: target.id, email: target.email }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}