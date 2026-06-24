/**
 * POST /api/admin/resource-overwrite
 * Overwrite the file for an existing Resource with a new PDF.
 * Used to re-strip watermarks on already-imported files.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { put } from '@vercel/blob';

export const maxDuration = 60;
export const runtime = 'nodejs';

async function checkAdmin(req: NextRequest) {
  const seedToken = req.headers.get('x-seed-token') ||
    req.nextUrl.searchParams.get('token');
  if (seedToken && seedToken === process.env.SEED_TOKEN) {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (admin) return admin;
  }
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') throw new Error('Admin requis');
  return user;
}

export async function POST(req: NextRequest) {
  try {
    await checkAdmin(req);

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'multipart/form-data requis' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const resourceId = formData.get('resourceId') as string | null;

    if (!file || !resourceId) {
      return NextResponse.json({ error: 'file + resourceId requis' }, { status: 400 });
    }

    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) {
      return NextResponse.json({ error: 'Resource non trouvée' }, { status: 404 });
    }

    const fileKey = resource.fileKey;
    if (!fileKey) {
      return NextResponse.json({ error: 'Resource fileKey manquante' }, { status: 400 });
    }

    // Upload new PDF to the SAME path (allowOverwrite:true)
    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const blob = await put(fileKey, pdfBuffer, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    // Update resource
    await prisma.resource.update({
      where: { id: resourceId },
      data: {
        fileUrl: blob.url,
        fileSize: pdfBuffer.length,
      },
    });

    // Also update the TeacherFile if exists
    await prisma.teacherFile.updateMany({
      where: { resourceId },
      data: {
        pdfUrl: blob.url,
        pdfSize: pdfBuffer.length,
      },
    });

    return NextResponse.json({
      success: true,
      resourceId,
      newUrl: blob.url,
      oldSize: resource.fileSize,
      newSize: pdfBuffer.length,
      sizeDelta: resource.fileSize - pdfBuffer.length,
    });
  } catch (e: any) {
    console.error('[resource-overwrite]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}