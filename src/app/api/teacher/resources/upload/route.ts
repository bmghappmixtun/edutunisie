export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { uploadFile } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/teacher/resources/upload
 * Step 1 of resource creation: upload the file only, get back the fileKey/fileUrl.
 * Step 2 (POST /api/teacher/resources) creates the resource record with the uploaded file.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Réservé aux enseignants' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Le fichier doit être un PDF' }, { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 50 MB)' }, { status: 400 });
    }

    // Upload file
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'pdf';
    const fileName = `resources/pending/${user.id}-${Date.now()}.${ext}`;
    const uploadResult: any = await uploadFile(fileName, buffer, 'application/pdf');

    return NextResponse.json({
      success: true,
      fileKey: uploadResult.key || fileName,
      fileUrl: uploadResult.url,
      fileSize: file.size,
      fileName: file.name,
    });
  } catch (e: any) {
    console.error('Upload error:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}
