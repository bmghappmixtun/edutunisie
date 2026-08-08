export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/resource-overwrite
 * Overwrite the file for an existing Resource with a new PDF.
 * Uses a NEW path to bypass Vercel Blob CDN cache (which is 30 days).
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { put, del } from '@vercel/blob';

export const maxDuration = 60;
export const runtime = 'nodejs';

async function checkAdmin(req: NextRequest) {
  const seedToken = req.headers.get('x-seed-token') || req.nextUrl.searchParams.get('token');
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

    const oldKey = resource.fileKey;
    const oldUrl = resource.fileUrl;

    // Strategy: upload to NEW path with random suffix to bypass CDN cache
    // Then delete old blob (after confirming new is live)
    const pdfBuffer = Buffer.from(await file.arrayBuffer());

    // Get directory from old key (e.g., "teacher-library/teacherId/imported/")
    const keyDir =
      oldKey?.substring(0, oldKey.lastIndexOf('/') + 1) ||
      `teacher-library/${resource.teacherId}/imported/`;

    // New filename: timestamp + nanoid to ensure CDN freshness
    const newFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}-${resourceId.substring(0, 6)}.pdf`;
    const newKey = `${keyDir}${newFilename}`;

    const blob = await put(newKey, pdfBuffer, {
      access: 'public',
      addRandomSuffix: false,
    });

    // ============================================================
    // AUTO-DETECT if the new file contains a correction
    // Heuristic:
    //   1. Get new page count (pdf-lib)
    //   2. OCR last 1-2 pages (pdf-parse) - look for "corrig", "barème", "solution"
    //   3. If detected, set hasCorrection=true + pageCount + correctionSummary
    //   4. Fallback: if newSize > oldSize * 1.3, assume correction added
    // ============================================================
    const updateData: any = {
      fileKey: blob.pathname,
      fileUrl: blob.url,
      fileSize: pdfBuffer.length,
    };

    let newPageCount: number | null = null;
    let detectedHasCorrection: boolean | null = null;
    let detectionMethod: string = 'none';
    let lastPageText: string = '';

    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      newPageCount = pdfDoc.getPageCount();
      updateData.pageCount = newPageCount;
    } catch (e) {
      console.warn('[resource-overwrite] pdf-lib failed to read page count:', (e as Error).message);
    }

    // OCR last 2 pages for correction keywords
    try {
      const pdfParseModule = await import('pdf-parse');
      const PDFParseClass = (pdfParseModule as any).PDFParse;
      if (PDFParseClass) {
        const parser = new PDFParseClass({ data: pdfBuffer });
        const parsed = await parser.getText();
        const pages = parsed.pages || [];
        if (pages.length > 0) {
          // Get text from last 2 pages
          const lastPages = pages.slice(-Math.min(2, pages.length));
          lastPageText = lastPages.map((p: any) => (p.text || '').toLowerCase()).join(' ');
        }
      }
    } catch (e) {
      console.warn('[resource-overwrite] pdf-parse failed to extract text:', (e as Error).message);
    }

    // Keyword detection
    const correctionKeywords = [
      'corrig',         // corrigé, correction
      'réponse',
      'barème',
      'barème',
      'note:',
      'note :',
      'solution',       // ex: "Solution exercice 1"
      '/ points',       // ex: "2/4 points"
      'points)',
    ];

    const keywordsFound = correctionKeywords.filter((kw) => lastPageText.includes(kw));

    if (keywordsFound.length >= 2) {
      // Strong signal: multiple keywords → has correction
      detectedHasCorrection = true;
      detectionMethod = `ocr_keywords:${keywordsFound.join(',')}`;
    } else if (keywordsFound.length === 1 && lastPageText.length > 100) {
      // Single keyword but reasonable text → likely has correction
      detectedHasCorrection = true;
      detectionMethod = `ocr_keyword_single:${keywordsFound[0]}`;
    } else {
      // Fallback: size heuristic
      const oldSize = resource.fileSize || 0;
      if (oldSize > 0 && pdfBuffer.length > oldSize * 1.3) {
        detectedHasCorrection = true;
        detectionMethod = `size_heuristic:new=${pdfBuffer.length},old=${oldSize}`;
      } else {
        // No strong signal: trust existing value (don't override)
        detectedHasCorrection = null;
      }
    }

    if (detectedHasCorrection === true) {
      updateData.hasCorrection = true;
      // Only set correctionSummary if not already set or generic
      if (!resource.correctionSummary) {
        const enoncePages = newPageCount && lastPageText ? '?' : '?';
        updateData.correctionSummary =
          `Le corrigé détaillé est intégré à la fin du document. Faites défiler pour le consulter.`;
      }
    } else if (detectedHasCorrection === false) {
      // Explicit detection: NO correction in this file
      // Only override if we had strong signal it's missing
      // For now, keep existing value (don't change)
    }

    console.log(
      `[resource-overwrite] auto-detect: hasCorrection=${detectedHasCorrection} method=${detectionMethod} newPages=${newPageCount} newSize=${pdfBuffer.length} oldSize=${resource.fileSize}`
    );

    // Update resource with new key + auto-detected fields
    await prisma.resource.update({
      where: { id: resourceId },
      data: updateData,
    });

    // Also update TeacherFile
    await prisma.teacherFile.updateMany({
      where: { resourceId },
      data: {
        pdfUrl: blob.url,
        pdfSize: pdfBuffer.length,
      },
    });

    // Try to delete old blob (best effort - might fail if not yet expired)
    if (oldKey && oldKey !== blob.pathname) {
      try {
        await del(oldUrl);
      } catch (e) {
        // Ignore - old blob will expire naturally
      }
    }

    return NextResponse.json({
      success: true,
      resourceId,
      oldKey,
      newKey: blob.pathname,
      newUrl: blob.url,
      oldSize: resource.fileSize,
      newSize: pdfBuffer.length,
      sizeDelta: resource.fileSize - pdfBuffer.length,
      detected: {
        hasCorrection: detectedHasCorrection,
        method: detectionMethod,
        pageCount: newPageCount,
        keywordsFound: lastPageText ? correctionKeywords.filter((kw) => lastPageText.includes(kw)) : [],
      },
    });
  } catch (e: any) {
    console.error('[resource-overwrite]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
