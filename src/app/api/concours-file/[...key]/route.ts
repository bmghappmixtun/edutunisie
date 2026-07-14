/**
 * Concours file proxy.
 *
 * Hides the Vercel Blob URL by serving files from examanet.com.
 * The user sees /api/concours-file/... in their browser instead of
 * kmy1h6us8l7bg7bg.public.blob.vercel-storage.com/...
 *
 * The [...key] is the same key used in the manifest (e.g.
 * "concours-9eme/9raya/2020/general/sujets+correction/math.pdf").
 *
 * Security: only allows paths that exist in the manifest (which is
 * curated during upload — not user-generated). This prevents SSRF.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConcours9emeFiles } from '@/lib/concours-9eme-data';

const BLOB_BASE_URL = 'https://kmy1h6us8l7bg7bg.public.blob.vercel-storage.com';

function sanitizeFilename(name: string): string {
  return name
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/[<>:"/\\|?*]/g, '_')
    .substring(0, 200);
}

function getFilenameFromKey(key: string): string {
  // e.g. "concours-9eme/9raya/2020/general/sujets+correction/math.pdf" → "math.pdf"
  const parts = key.split('/');
  return parts[parts.length - 1] || 'document.pdf';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: keyParts } = await params;
  const key = keyParts.map(decodeURIComponent).join('/');

  // Look up the file in the manifest — only allow curated files
  const files = getConcours9emeFiles();
  const file = files.find((f) => f.key === key);

  if (!file) {
    return new NextResponse('Fichier non trouvé', { status: 404 });
  }

  // Build the upstream URL (server-side, hidden from user)
  const upstreamUrl = file.url.startsWith('http') ? file.url : `${BLOB_BASE_URL}/${file.url}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { 'User-Agent': 'Examanet-Proxy/1.0' },
    });

    if (!upstream.ok) {
      return new NextResponse(`Upstream fetch failed: ${upstream.status}`, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'application/pdf';
    const stream = upstream.body;
    if (!stream) {
      return new NextResponse('No body', { status: 502 });
    }

    const filename = getFilenameFromKey(key);

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${sanitizeFilename(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'public, max-age=86400, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e: any) {
    return new NextResponse(`Proxy error: ${e.message}`, { status: 502 });
  }
}
