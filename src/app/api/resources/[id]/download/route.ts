/**
 * Download proxy for resources.
 *
 * IMPORTANT: This endpoint streams the file from Vercel Blob server-side
 * so the user never sees the blob.vercel-storage.com URL. The download
 * appears to come from examanet.com.
 *
 * - POST: returns JSON with { url: '/api/resources/{id}/download', ... }
 *   (the client then navigates to that URL, which triggers a GET)
 * - GET: streams the file from blob storage to the client with proper
 *   Content-Disposition: attachment; filename="..." so the file downloads
 *   with the right name.
 *
 * Also tracks downloads in the DB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getVisitorIpFromRequest, isBotOrPlaceholder } from '@/lib/visitor';

function sanitizeFilename(name: string): string {
  // Strip control characters and limit length
  return name
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/[<>:"/\\|?*]/g, '_')
    .substring(0, 200);
}

function buildFilename(
  resource: { title: string; originalFileName?: string | null },
  original: boolean,
): string {
  if (original && resource.originalFileName) {
    return resource.originalFileName;
  }
  // Strip HTML entities and weird chars from title, then add .pdf
  const cleanTitle = resource.title
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[^a-zA-Z0-9À-ÿ\s\-_()]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 150);
  return `${cleanTitle || 'document'}.pdf`;
}

/**
 * Stream a file from a URL (Vercel Blob) to the client.
 * Sets Content-Disposition so the browser downloads with the right filename.
 */
async function streamFileToClient(
  blobUrl: string,
  filename: string,
  contentType?: string,
): Promise<NextResponse> {
  // Fetch the file from blob storage (server-side, so URL is hidden)
  const upstream = await fetch(blobUrl, {
    headers: { 'User-Agent': 'Examanet-Proxy/1.0' },
  });

  if (!upstream.ok) {
    return new NextResponse(`Upstream fetch failed: ${upstream.status}`, { status: 502 });
  }

  // Get content type from upstream or default to PDF
  const upstreamType = upstream.headers.get('content-type') || contentType || 'application/pdf';

  // Sanitize filename for Content-Disposition
  const safeName = sanitizeFilename(filename);

  // Stream the response
  // Note: Next.js can stream via ReadableStream
  const stream = upstream.body;
  if (!stream) {
    return new NextResponse('No body', { status: 502 });
  }

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': upstreamType,
      'Content-Disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      'Cache-Control': 'public, max-age=3600, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  const ip = getVisitorIpFromRequest(req);
  const ua = req.headers.get('user-agent');
  const skipTracking = isBotOrPlaceholder(ip, ua);

  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });

  const wantsOriginal = req.nextUrl.searchParams.get('original') === '1';

  if (wantsOriginal && resource.originalFileKey) {
    if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Les fichiers originaux Office sont réservés à la communauté des enseignants' },
        { status: 403 },
      );
    }
    if (!skipTracking) {
      await prisma.download.create({ data: { resourceId: id, userId: user.id, ipAddress: ip } });
    }
    // Return the proxy URL (same endpoint, original=1)
    return NextResponse.json({
      url: `/api/resources/${id}/download?original=1`,
      fileName: buildFilename(resource, true),
      original: true,
      format: resource.originalFormat,
    });
  }

  if (!skipTracking) {
    await prisma.download.create({ data: { resourceId: id, userId: user?.id, ipAddress: ip } });
    await prisma.resource.update({ where: { id }, data: { downloadsCount: { increment: 1 } } });
  }

  // Return the proxy URL (same endpoint, no original)
  return NextResponse.json({
    url: `/api/resources/${id}/download`,
    fileName: buildFilename(resource, false),
  });
}

/**
 * GET endpoint: streams the file to the client.
 * - ?original=1: serve the original Office file (teacher-only)
 * - default: serve the converted PDF
 *
 * The browser will see the download coming from examanet.com.
 * The blob.vercel-storage.com URL is never exposed to the user.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  const wantsOriginal = req.nextUrl.searchParams.get('original') === '1';
  const ip = getVisitorIpFromRequest(req);
  const ua = req.headers.get('user-agent');
  const skipTracking = isBotOrPlaceholder(ip, ua);

  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });

  if (wantsOriginal) {
    if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Réservé aux enseignants' }, { status: 403 });
    }
    if (!resource.originalFileKey) {
      return NextResponse.json({ error: "Pas d'original" }, { status: 404 });
    }
    if (!skipTracking) {
      await prisma.download.create({ data: { resourceId: id, userId: user.id, ipAddress: ip } });
    }

    // Get the original file from teacher library
    const libFile = await prisma.teacherFile.findFirst({
      where: { resourceId: id },
      select: { fileUrl: true, fileName: true },
    });
    if (libFile) {
      const contentType = libFile.fileName?.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : libFile.fileName?.endsWith('.odt')
          ? 'application/vnd.oasis.opendocument.text'
          : 'application/octet-stream';
      return streamFileToClient(libFile.fileUrl, libFile.fileName || 'document', contentType);
    }
    return NextResponse.json({ error: 'Fichier original introuvable' }, { status: 404 });
  }

  // Default: stream the PDF through our domain
  if (!skipTracking) {
    await prisma.download.create({ data: { resourceId: id, userId: user?.id, ipAddress: ip } });
    await prisma.resource.update({ where: { id }, data: { downloadsCount: { increment: 1 } } });
  }

  return streamFileToClient(resource.fileUrl, buildFilename(resource, false), 'application/pdf');
}
