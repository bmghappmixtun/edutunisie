import { NextRequest, NextResponse } from 'next/server';
import { isValidOrigin, isProduction } from '@/lib/security';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/storage';
import { notifyAdminsNewResource } from '@/lib/admin-notify';
import { detectFormat } from '@/lib/document-converter';
import { autoGenerateTags } from '@/lib/auto-tagger';
import { properSlugify } from '@/lib/slugify';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // SECURITY: CSRF origin check (production only)
  if (isProduction() && !isValidOrigin(req)) {
    return NextResponse.json({ error: 'Origine non autorisée' }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Réservé aux enseignants' }, { status: 403 });
  }
  // Block teachers who haven't completed file verification
  if (user.role === 'TEACHER' && user.status === 'PENDING_FILE_VERIFICATION') {
    return NextResponse.json(
      {
        error:
          "Vous devez d'abord soumettre vos 5 fichiers de vérification avant de pouvoir publier des ressources. Rendez-vous sur votre tableau de bord.",
        code: 'PENDING_FILE_VERIFICATION',
      },
      { status: 403 },
    );
  }
  if (user.role === 'TEACHER' && user.status === 'PENDING_APPROVAL') {
    return NextResponse.json(
      {
        error: "Votre compte est en attente d'approbation par l'administrateur.",
        code: 'PENDING_APPROVAL',
      },
      { status: 403 },
    );
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
    let fileKey: string | null = null;
    let fileUrl: string | null = null;
    let fileSize = 0;
    let libraryFileId: string | null = null; // <- NEW: link to teacher library file

    // Homework & school metadata (NEW)
    let homeworkSubtype: string | null = null; // CONTROL | SYNTHESIS | HOUSEWORK
    let homeworkNumber: number | null = null; // 1, 2, 3, 4, 5+ ...
    let schoolType: string | null = null; // PUBLIC | PILOTE
    let product: string | null = null; // المنتج (Arabic text)
    let hasCorrection: boolean = false; // file contains corrigé
    let correctionSummary: string | null = null; // description of correction

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
      libraryFileId = (formData.get('libraryFileId') as string | null) || null;
      // Homework & school metadata (NEW)
      const rawSubtype = formData.get('homeworkSubtype');
      const rawNumber = formData.get('homeworkNumber');
      const rawSchoolType = formData.get('schoolType');
      const rawProduct = formData.get('product');
      const rawHasCorrection = formData.get('hasCorrection');
      const rawCorrectionSummary = formData.get('correctionSummary');
      if (rawSubtype && typeof rawSubtype === 'string' && rawSubtype.trim()) {
        const allowed = ['CONTROL', 'SYNTHESIS', 'HOUSEWORK'];
        if (allowed.includes(rawSubtype)) homeworkSubtype = rawSubtype;
      }
      if (rawNumber) {
        const n = parseInt(String(rawNumber), 10);
        if (Number.isFinite(n) && n >= 1 && n <= 20) homeworkNumber = n;
      }
      if (rawSchoolType && typeof rawSchoolType === 'string' && rawSchoolType.trim()) {
        const allowed = ['PUBLIC', 'PRIVATE', 'PILOTE'];
        if (allowed.includes(rawSchoolType)) schoolType = rawSchoolType;
      }
      if (rawProduct && typeof rawProduct === 'string' && rawProduct.trim()) {
        product = String(rawProduct).trim().substring(0, 200);
      }
      if (rawHasCorrection === 'true' || rawHasCorrection === 'on' || rawHasCorrection === '1') {
        hasCorrection = true;
        if (
          rawCorrectionSummary &&
          typeof rawCorrectionSummary === 'string' &&
          rawCorrectionSummary.trim()
        ) {
          correctionSummary = String(rawCorrectionSummary).trim().substring(0, 500);
        }
      }
    } else {
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
      fileKey = body.fileKey || null;
      fileUrl = body.fileUrl || null;
      fileSize = body.fileSize || 0;
      libraryFileId = body.libraryFileId || null;
      // Homework & school metadata (NEW)
      const allowedSubtypes = ['CONTROL', 'SYNTHESIS', 'HOUSEWORK'];
      if (allowedSubtypes.includes(body.homeworkSubtype)) homeworkSubtype = body.homeworkSubtype;
      if (body.homeworkNumber) {
        const n = parseInt(String(body.homeworkNumber), 10);
        if (Number.isFinite(n) && n >= 1 && n <= 20) homeworkNumber = n;
      }
      const allowedSchool = ['PUBLIC', 'PRIVATE', 'PILOTE'];
      if (allowedSchool.includes(body.schoolType)) schoolType = body.schoolType;
      if (body.product && typeof body.product === 'string')
        product = body.product.trim().substring(0, 200);
      hasCorrection = body.hasCorrection === true || body.hasCorrection === 'true';
      if (body.correctionSummary && typeof body.correctionSummary === 'string') {
        correctionSummary = body.correctionSummary.trim().substring(0, 500);
      }
    }

    if (!title || !type || !subjectSlug || !classSlug) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    const subjectRec = await prisma.subject.findUnique({ where: { slug: subjectSlug } });
    const classRec = await prisma.class.findUnique({ where: { slug: classSlug } });
    if (!subjectRec || !classRec) {
      return NextResponse.json({ error: 'Matière ou classe invalide' }, { status: 400 });
    }

    const sectionRec = sectionSlug
      ? await prisma.section.findFirst({ where: { classId: classRec.id, slug: sectionSlug } })
      : null;
    // Use proper slugify: transliterate accents, keep Arabic letters, no cuid/nanoid suffix
    // (The URL is /ressources/{numericId}/{slug} — numericId is the stable identifier)
    const slug = properSlugify(title);

    // Original file metadata (will be copied from library file if used)
    let originalFileKey: string | null = null;
    let originalFileName: string | null = null;
    let originalFormat: string | null = null;
    let originalFileSize: number | null = null;

    // ===== FILE HANDLING =====
    // 3 cases:
    //   A) libraryFileId provided → use the library file's PDF (and copy original metadata)
    //   B) multipart with file → upload now (PDF or converted docx)
    //   C) JSON with fileKey/fileUrl → use pre-uploaded file (already handled)

    if (libraryFileId) {
      const libFile = await prisma.teacherFile.findUnique({ where: { id: libraryFileId } });
      if (!libFile || libFile.teacherId !== user.id) {
        return NextResponse.json({ error: 'Fichier de bibliothèque invalide' }, { status: 400 });
      }
      if (libFile.resourceId) {
        return NextResponse.json(
          { error: 'Ce fichier a déjà été utilisé pour publier une ressource' },
          { status: 409 },
        );
      }

      // Use the PDF (converted or original).
      // Fall back to the original file if pdfUrl is not set (happens for old
      // TeacherFile records where pdfKey/pdfUrl were left null even for PDFs).
      const finalPdfUrl = libFile.pdfUrl || libFile.fileUrl;
      const finalPdfKey = libFile.pdfKey || libFile.fileKey;
      if (!finalPdfUrl || !finalPdfKey) {
        return NextResponse.json(
          {
            error: 'Conversion PDF échouée. Ré-uploadez le fichier en PDF manuellement.',
          },
          { status: 400 },
        );
      }
      fileUrl = finalPdfUrl;
      fileKey = finalPdfKey;
      fileSize = libFile.pdfSize || libFile.fileSize;

      // Copy original metadata
      originalFileKey = libFile.fileKey;
      originalFileName = libFile.fileName;
      originalFormat = libFile.originalFormat;
      originalFileSize = libFile.fileSize;
    } else if (file) {
      // Direct upload in this request
      const fmt = detectFormat(file.name, file.type);
      if (fmt.format === 'unknown') {
        return NextResponse.json(
          { error: 'Format non supporté. Formats acceptés: .pdf, .docx, .doc, .odt' },
          { status: 400 },
        );
      }
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Le fichier doit faire moins de 50 Mo' },
          { status: 400 },
        );
      }

      // PDF: upload as-is. Word: upload as-is too (will be in originalFileKey)
      originalFileName = file.name;
      originalFormat = fmt.format;
      originalFileSize = file.size;

      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

      // Always save the original file (so teacher keeps their source)
      const originalKey = `teacher-library/${user.id}/${timestamp}-${safeName}`;
      const originalBlob = await uploadFile(
        originalKey,
        Buffer.from(await file.arrayBuffer()),
        file.type || 'application/octet-stream',
      );
      originalFileKey = originalKey;

      if (fmt.isPdf) {
        fileUrl = originalBlob.url;
        fileKey = originalKey;
        fileSize = file.size;
      } else {
        // Convert non-PDF to PDF on the fly
        try {
          const { convertDocxToPdf } = await import('@/lib/document-converter');
          const result = await convertDocxToPdf(Buffer.from(await file.arrayBuffer()), {
            fileName: file.name,
            title: file.name.replace(/\.[^.]+$/, ''),
          });
          if (!result.pdfBuffer) {
            return NextResponse.json(
              { error: 'Conversion PDF échouée. Uploadez le fichier en PDF manuellement.' },
              { status: 400 },
            );
          }
          const pdfKey = `teacher-resources/${user.id}/${timestamp}-converted.pdf`;
          const pdfBlob = await uploadFile(pdfKey, result.pdfBuffer, 'application/pdf');
          fileUrl = pdfBlob.url;
          fileKey = pdfKey;
          fileSize = result.pdfSize ?? result.pdfBuffer.length;
        } catch (convErr) {
          console.error('[teacher/resources] conversion failed:', convErr);
          return NextResponse.json(
            {
              error: 'Conversion PDF échouée. Uploadez le fichier en PDF manuellement.',
            },
            { status: 400 },
          );
        }
      }
    } else if (fileKey && fileUrl) {
      // JSON path with pre-uploaded file
      // (existing behavior - file was uploaded via /api/teacher/resources/upload)
      // No original file in this case (legacy flow)
    } else {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Auto-generate smart SEO tags (overrides empty user tags)
    const autoTags = autoGenerateTags({
      title,
      subjectSlug: subjectRec.slug,
      classSlug: classRec.slug,
      sectionSlug: sectionRec?.slug,
      type,
      year,
      trimester,
      homeworkSubtype: type === 'HOMEWORK' ? homeworkSubtype : null,
      homeworkNumber,
      hasCorrection,
    });
    // Merge: user-provided tags + auto-generated (deduped, max 15)
    const finalTags = Array.from(
      new Set([
        ...(tags
          ? tags
              .split(',')
              .map((t: string) => t.trim())
              .filter(Boolean)
          : []),
        ...autoTags,
      ]),
    )
      .slice(0, 15)
      .join(',');

    const resource = await prisma.resource.create({
      data: {
        slug,
        title,
        description,
        type,
        status: 'PENDING_APPROVAL',
        fileKey: fileKey!,
        fileUrl: fileUrl!,
        fileSize,
        subjectId: subjectRec.id,
        classId: classRec.id,
        sectionId: sectionRec?.id,
        teacherId: user.id,
        trimester,
        year,
        tags: finalTags,
        pageCount: 10,
        // Homework & school metadata (NEW)
        homeworkSubtype: type === 'HOMEWORK' ? homeworkSubtype : null,
        homeworkNumber,
        schoolType,
        product,
        hasCorrection,
        correctionSummary,
        // Original file (kept in library for teacher)
        originalFileKey,
        originalFileName,
        originalFormat,
        originalFileSize,
      },
    });

    // Link library file → resource (so the library page knows this file is "used")
    if (libraryFileId) {
      await prisma.teacherFile.update({
        where: { id: libraryFileId },
        data: { resourceId: resource.id },
      });
    }

    // Notify admins
    await notifyAdminsNewResource(resource.id).catch((e) =>
      console.error('Admin notify error:', e),
    );

    return NextResponse.json({ success: true, resource });
  } catch (e: any) {
    console.error('[teacher/resources] POST', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
