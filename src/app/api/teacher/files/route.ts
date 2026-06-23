/**
 * GET /api/teacher/files
 *   ?classId=&type=&format=&search=
 *   Lists the teacher's library files
 *
 * DELETE /api/teacher/files?id=
 *   Deletes a library file (only if owner)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteFile } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId') || undefined;
    const type = searchParams.get('type') || undefined;
    const format = searchParams.get('format') || undefined;
    const search = searchParams.get('search') || undefined;

    const where: any = { teacherId: user.id };
    if (classId) where.classId = classId;
    if (type) where.type = type;
    if (format) where.originalFormat = format;
    if (search) {
      where.OR = [
        { fileName: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { tags: { contains: search, mode: 'insensitive' } },
      ];
    }

    const files = await prisma.teacherFile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        class: { select: { id: true, nameFr: true, nameAr: true } },
        section: { select: { id: true, nameFr: true, nameAr: true } },
        subject: { select: { id: true, nameFr: true, nameAr: true, color: true } },
        resource: { select: { id: true, status: true } },
      },
    });

    return NextResponse.json({ files });
  } catch (err) {
    console.error('[teacher/files] GET', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    const file = await prisma.teacherFile.findUnique({
      where: { id },
      include: { resource: { select: { id: true } } },
    });

    if (!file) {
      return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 });
    }

    if (file.teacherId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Block deletion if used by an active resource
    if (file.resource) {
      return NextResponse.json(
        { error: 'Ce fichier est utilisé par une ressource publiée. Supprimez-la d\'abord.' },
        { status: 409 }
      );
    }

    // Delete from storage (best effort)
    try {
      await deleteFile(file.fileKey);
    } catch (e) {
      console.warn('[teacher/files] DELETE blob original failed:', e);
    }
    if (file.pdfKey) {
      try {
        await deleteFile(file.pdfKey);
      } catch (e) {
        console.warn('[teacher/files] DELETE blob pdf failed:', e);
      }
    }

    await prisma.teacherFile.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[teacher/files] DELETE', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}