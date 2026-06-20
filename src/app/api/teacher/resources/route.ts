import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/storage';
import { nanoid } from 'nanoid';
import { notifyAdminsNewResource } from '@/lib/admin-notify';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Réservé aux enseignants' }, { status: 403 });
  }

  try {
    // Parse form data (multipart/form-data) OR JSON body
    let file: File | null = null;
    let title = '';
    let description: string | null = null;
    let type = '';
    let subjectSlug = '';
    let classSlug = '';
    let sectionSlug: string | null = null;
    let trimester: string | null = null;
    let year: string | null = null;
    let tags: string | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      file = formData.get('file') as File | null;
      title = formData.get('title') as string;
      description = formData.get('description') as string | null;
      type = formData.get('type') as string;
      subjectSlug = formData.get('subject') as string;
      classSlug = formData.get('class') as string;
      sectionSlug = formData.get('section') as string | null;
      trimester = formData.get('trimester') as string | null;
      year = formData.get('year') as string | null;
      tags = formData.get('tags') as string | null;
    } else {
      // Fallback: parse JSON body
      const body = await req.json();
      title = body.title;
      description = body.description || null;
      type = body.type;
      subjectSlug = body.subject;
      classSlug = body.class;
      sectionSlug = body.section || null;
      trimester = body.trimester || null;
      year = body.year || null;
      tags = body.tags || null;
    }

    if (!title || !type || !subjectSlug || !classSlug) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    const subjectRec = await prisma.subject.findUnique({ where: { slug: subjectSlug } });
    const classRec = await prisma.class.findUnique({ where: { slug: classSlug } });
    if (!subjectRec || !classRec) return NextResponse.json({ error: 'Matière ou classe invalide' }, { status: 400 });

    const sectionRec = sectionSlug ? await prisma.section.findFirst({ where: { classId: classRec.id, slug: sectionSlug } }) : null;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60) + '-' + nanoid(5);

    // File: either from form (file in multipart) OR pre-uploaded (fileKey in JSON)
    let fileUrl = '/sample-pdf.pdf';
    let fileKey = 'sample';
    let fileSize = 0;
    if (file) {
      // Multipart: file was uploaded as part of this request
      if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Seuls les PDF sont acceptés' }, { status: 400 });
      }
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ error: 'Le fichier doit faire moins de 50 Mo' }, { status: 400 });
      }
      const upload = await uploadFile(file.name, file, file.type);
      fileUrl = upload.url;
      fileKey = upload.key;
      fileSize = file.size;
    } else if (!contentType.includes('multipart/form-data') && req.headers.get('content-type')?.includes('application/json')) {
      // JSON: file was uploaded separately via /api/teacher/resources/upload
      const body = await req.json();
      if (body.fileKey && body.fileUrl) {
        fileKey = body.fileKey;
        fileUrl = body.fileUrl;
        fileSize = body.fileSize || 0;
      } else {
        return NextResponse.json({ error: 'Aucun fichier fourni. Uploadez d.abord le PDF.' }, { status: 400 });
      }
    }

    const resource = await prisma.resource.create({
      data: {
        slug,
        title,
        description,
        type,
        status: 'PENDING_APPROVAL',
        fileKey,
        fileUrl,
        fileSize,
        subjectId: subjectRec.id,
        classId: classRec.id,
        sectionId: sectionRec?.id,
        teacherId: user.id,
        trimester,
        year,
        tags,
        pageCount: 10,
      }
    });

    // Notify admins (in-app + email)
    await notifyAdminsNewResource(resource.id).catch(e => console.error('Admin notify error:', e));

    return NextResponse.json({ success: true, resource });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
