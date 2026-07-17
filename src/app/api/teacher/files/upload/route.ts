/**
 * POST /api/teacher/files/upload
 *
 * Accepts a single file upload (.pdf, .docx, .doc, .odt) from a teacher.
 *
 * - If .pdf → stored as-is, no conversion
 * - If .docx/.doc/.odt → original saved + PDF generated via mammoth+puppeteer
 *
 * Always returns:
 *   {
 *     libraryFileId: string,    // ID of the TeacherFile record
 *     fileKey: string,          // blob key for the ORIGINAL
 *     fileUrl: string,          // public URL for the ORIGINAL
 *     pdfKey?: string,          // blob key for the generated PDF
 *     pdfUrl?: string,          // public URL for the PDF
 *     originalFormat: string,
 *     conversionStatus: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'PENDING'
 *     warnings?: string[]
 *   }
 *
 * The teacher can later either:
 *   1. Download the original from /enseignant/bibliotheque
 *   2. Use POST /api/teacher/resources with libraryFileId to publish as a Resource
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidOrigin, isProduction } from '@/lib/security';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/storage';
import { convertDocxToPdf, detectFormat } from '@/lib/document-converter';

// Allow large uploads (50MB) - Vercel serverless limit
export const maxDuration = 60; // seconds
export const runtime = 'nodejs'; // need full Node for puppeteer/chromium

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(req: NextRequest) {
  // SECURITY: CSRF origin check (production only)
  if (isProduction() && !isValidOrigin(req)) {
    return NextResponse.json({ error: 'Origine non autorisée' }, { status: 403 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Only teachers/admins can use the library
    if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Seuls les enseignants peuvent uploader des fichiers' },
        { status: 403 },
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const metadataStr = formData.get('metadata') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` },
        { status: 400 },
      );
    }

    // Parse metadata if provided (optional)
    let metadata: {
      type?: string;
      classId?: string;
      sectionId?: string;
      subjectId?: string;
      trimester?: string;
      year?: string;
      tags?: string;
      notes?: string;
    } = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch {
        // ignore, metadata is optional
      }
    }

    const format = detectFormat(file.name, file.type);
    if (format.format === 'unknown') {
      return NextResponse.json(
        { error: `Format non supporté: ${file.name}. Formats acceptés: .pdf, .docx, .doc, .odt` },
        { status: 400 },
      );
    }

    // SECURITY: Read first bytes to verify actual file content (magic number)
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const firstBytes = fileBuffer.slice(0, 8);
    let magicNumberValid = true;
    if (format.isPdf) {
      // PDF files start with %PDF-
      magicNumberValid = firstBytes.toString('ascii', 0, 5) === '%PDF-';
    } else if (format.format === 'docx' || format.format === 'doc') {
      // DOCX/DOC are ZIP-based (start with PK) or OLE (D0 CF 11 E0)
      const isPK = firstBytes[0] === 0x50 && firstBytes[1] === 0x4b; // ZIP (DOCX)
      const isOLE =
        firstBytes[0] === 0xd0 &&
        firstBytes[1] === 0xcf &&
        firstBytes[2] === 0x11 &&
        firstBytes[3] === 0xe0; // OLE (DOC)
      magicNumberValid = isPK || isOLE;
    } else if (format.format === 'odt') {
      // ODT is ZIP-based
      magicNumberValid = firstBytes[0] === 0x50 && firstBytes[1] === 0x4b;
    }
    if (!magicNumberValid) {
      console.warn(
        `[security] Rejected ${file.name} (${format.format}) — magic number mismatch: ${firstBytes.toString('hex')}`,
      );
      return NextResponse.json(
        { error: "Type de fichier invalide. Le contenu ne correspond pas à l'extension." },
        { status: 400 },
      );
    }

    // fileBuffer already read above for magic number check
    const teacherId = user.id;

    // 1. Save original file to Blob
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const originalKey = `teacher-library/${teacherId}/${timestamp}-${safeName}`;
    const originalBlob = await uploadFile(
      originalKey,
      fileBuffer,
      file.type || 'application/octet-stream',
    );
    const originalUrl = originalBlob.url;

    // 2. Convert to PDF if needed
    let pdfKey: string | undefined;
    let pdfUrl: string | undefined;
    let pdfSize: number | undefined;
    let conversionStatus: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'PENDING' = 'SKIPPED';
    const warnings: string[] = [];

    if (format.isPdf) {
      // Already a PDF - no conversion
      // Set pdfKey/pdfUrl to the same as the original since the original IS the PDF.
      // Without this, /api/teacher/resources rejects the publish with
      // "Conversion PDF échouée. Ré-uploadez en PDF." (false positive)
      pdfKey = originalKey;
      pdfUrl = originalUrl;
      pdfSize = file.size;
      conversionStatus = 'SKIPPED';
    } else if (format.isConvertible) {
      try {
        const result = await convertDocxToPdf(fileBuffer, {
          fileName: file.name,
          title: file.name.replace(/\.[^.]+$/, ''),
        });
        if (!result.pdfBuffer) {
          conversionStatus = 'FAILED';
          warnings.push(...result.warnings);
          warnings.push("Conversion PDF indisponible. L'original est sauvegardé.");
        } else {
          pdfKey = `teacher-library/${teacherId}/${timestamp}-converted.pdf`;
          const pdfBlob = await uploadFile(pdfKey, result.pdfBuffer, 'application/pdf');
          pdfUrl = pdfBlob.url;
          pdfSize = result.pdfSize ?? result.pdfBuffer.length;
          conversionStatus = 'SUCCESS';
          warnings.push(...result.warnings);
        }
      } catch (convErr) {
        console.error('[teacher/files/upload] Conversion failed:', convErr);
        conversionStatus = 'FAILED';
        warnings.push(
          `Conversion échouée: ${convErr instanceof Error ? convErr.message : 'erreur inconnue'}. L'original a été sauvegardé. Vous pouvez ré-uploader en PDF manuellement.`,
        );
      }
    }

    // 3. Create TeacherFile record
    const libraryFile = await prisma.teacherFile.create({
      data: {
        teacherId,
        fileName: file.name,
        originalFormat: format.format,
        fileKey: originalKey,
        fileUrl: originalUrl,
        fileSize: file.size,
        pdfKey,
        pdfUrl,
        pdfSize,
        conversionStatus,
        type: metadata.type,
        classId: metadata.classId,
        sectionId: metadata.sectionId,
        subjectId: metadata.subjectId,
        trimester: metadata.trimester,
        year: metadata.year,
        tags: metadata.tags,
        notes: metadata.notes,
      },
    });

    return NextResponse.json({
      success: true,
      libraryFileId: libraryFile.id,
      fileKey: originalKey,
      fileUrl: originalUrl,
      pdfKey,
      pdfUrl,
      originalFormat: format.format,
      conversionStatus,
      warnings: warnings.length > 0 ? warnings : undefined,
      file: {
        id: libraryFile.id,
        fileName: libraryFile.fileName,
        fileSize: libraryFile.fileSize,
        originalFormat: libraryFile.originalFormat,
        createdAt: libraryFile.createdAt,
      },
    });
  } catch (err) {
    console.error('[teacher/files/upload]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur serveur' },
      { status: 500 },
    );
  }
}
