// @ts-nocheck
export const dynamic = 'force-dynamic';

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

/**
 * 2026-08-24: Pick the right storage URL based on the request host.
 * - On Vercel (`*.examanet.com`): always use the existing Vercel Blob URL.
 *   The Vercel DB row's `r2Key` is NULL because we never ran the populate
 *   script on the main DB, so this is a no-op for Vercel.
 * - On CF (`*.workers.dev`): return a special marker so streamFileToClient
 *   knows to use the R2 binding directly (more efficient than fetching
 *   a public URL, and works without enabling r2.dev on the bucket).
 */
function pickStorageSource(
  host: string | null,
  primary: { fileUrl: string; r2Key?: string | null },
): { type: 'url'; url: string } | { type: 'r2'; key: string } {
  const isCF = host?.endsWith('.workers.dev') ?? false;
  if (isCF && primary.r2Key) {
    return { type: 'r2', key: primary.r2Key };
  }
  return { type: 'url', url: primary.fileUrl };
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
 * Stream a file to the client.
 * - source = { type: 'url', url }: fetch from URL (Vercel Blob or R2 public)
 * - source = { type: 'r2', key }: stream from CF R2 binding (no public URL needed)
 * Sets Content-Disposition so the browser downloads with the right filename.
 */
async function streamFileToClient(
  source: { type: 'url'; url: string } | { type: 'r2'; key: string },
  filename: string,
  contentType?: string,
): Promise<NextResponse> {
  const safeName = sanitizeFilename(filename);
  const finalContentType = contentType || 'application/pdf';

  // CF R2 binding path (no public URL needed, faster than HTTP fetch)
  if (source.type === 'r2') {
    try {
      // getCloudflareContext is provided by @opennextjs/cloudflare
      // (only available on CF Workers, throws on Vercel — but we only get
      // here on CF because pickStorageSource only returns 'r2' on CF)
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');
      const { env } = await getCloudflareContext({ async: true });
      // Use the dedicated PDFS_BUCKET binding (same bucket as the ISR cache,
      // but logically separate for clarity)
      const bucket = env.PDFS_BUCKET || env.NEXT_INC_CACHE_R2_BUCKET;
      if (!bucket) throw new Error('R2 binding not available on this worker');
      const object = await bucket.get(source.key);
      if (!object) {
        return new NextResponse(`File not found in R2: ${source.key}`, { status: 404 });
      }
      return new NextResponse(object.body, {
        status: 200,
        headers: {
          'Content-Type': object.httpMetadata?.contentType || finalContentType,
          'Content-Disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
          'Cache-Control': 'public, max-age=3600, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
          'X-Storage-Backend': 'cloudflare-r2',
        },
      });
    } catch (e: any) {
      // Fall through to error — R2 binding not available
      return new NextResponse(`R2 error: ${e.message || 'unknown'}`, { status: 502 });
    }
  }

  // URL path (Vercel Blob, or R2 public URL on CF if r2Key was missing)
  const upstream = await fetch(source.url, {
    headers: { 'User-Agent': 'Examanet-Proxy/1.0' },
  });

  if (!upstream.ok) {
    return new NextResponse(`Upstream fetch failed: ${upstream.status}`, { status: 502 });
  }

  const upstreamType = upstream.headers.get('content-type') || finalContentType;
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
      'X-Storage-Backend': 'vercel-blob',
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  const ip = getVisitorIpFromRequest(req);
  const ua = req.headers.get('user-agent');
  const skipTracking = isBotOrPlaceholder(ip, ua);

  const resource = await prisma.resource.findUnique({ where: { id }, select: { id: true, title: true, fileUrl: true, r2Key: true, originalFileKey: true, originalFileName: true, downloadsCount: true } });
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
  const reqStart = Date.now();
  try {

  const user = await getCurrentUser();
  const { id } = await params;
  const wantsOriginal = req.nextUrl.searchParams.get('original') === '1';
  const ip = getVisitorIpFromRequest(req);
  const ua = req.headers.get('user-agent');
  const skipTracking = isBotOrPlaceholder(ip, ua);

  const resource = await prisma.resource.findUnique({ where: { id }, select: { id: true, title: true, fileUrl: true, r2Key: true, originalFileKey: true, originalFileName: true, downloadsCount: true } });
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
      select: { fileUrl: true, fileName: true, r2Key: true, r2PdfKey: true },
    });
    if (libFile) {
      const contentType = libFile.fileName?.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : libFile.fileName?.endsWith('.odt')
          ? 'application/vnd.oasis.opendocument.text'
          : 'application/octet-stream';
      // 2026-08-24: CF uses R2 binding (r2Key); Vercel uses Vercel Blob (fileUrl)
      const libSource = pickStorageSource(req.headers.get('host'), {
        fileUrl: libFile.fileUrl,
        r2Key: libFile.r2Key,
      });
      return streamFileToClient(libSource, libFile.fileName || 'document', contentType);
    }
    return NextResponse.json({ error: 'Fichier original introuvable' }, { status: 404 });
  }

  // Default: stream the PDF through our domain
  if (!skipTracking) {
    await prisma.download.create({ data: { resourceId: id, userId: user?.id, ipAddress: ip } });
    await prisma.resource.update({ where: { id }, data: { downloadsCount: { increment: 1 } } });
  }

  return streamFileToClient(
    pickStorageSource(req.headers.get('host'), { fileUrl: resource.fileUrl, r2Key: resource.r2Key }),
    buildFilename(resource, false),
    'application/pdf'
  );

  } catch (e: any) {
    // 2026-08-26: catch-all to surface real error instead of "error code: 1101"
    const elapsed = Date.now() - reqStart;
    console.error('[download FAILED]', {
      elapsed,
      error: e?.message || String(e),
      stack: e?.stack?.split('\n').slice(0, 3).join(' | '),
      name: e?.name,
    });
    return new NextResponse(
      JSON.stringify({
        error: 'Download failed',
        message: e?.message || String(e),
        elapsed,
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
