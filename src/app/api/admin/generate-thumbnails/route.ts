/**
 * Bulk thumbnail generator (one-by-one).
 *
 * Input: { fileKey: string, resourceId: string }
 * 1. Download PDF from Vercel Blob
 * 2. Render first page using pdfjs-dist (Node.js) 
 * 3. Upload JPEG to Vercel Blob
 * 4. Update Resource.thumbnailKey + thumbnailUrl
 *
 * Protected by X-Internal-Token.
 *
 * NOTE: For 15K+ resources, run this from a worker that calls the endpoint
 * 100 resources at a time. Use GET to check status.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/storage';

const BLOB_BASE = 'https://kmy1h6us8l7bg7bg.public.blob.vercel-storage.com';
const INTERNAL_TOKEN = process.env.INTERNAL_BULK_TOKEN || 'devmanet-bulk-2026';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

async function downloadPdf(fileKey: string): Promise<Buffer | null> {
  const directUrl = `${BLOB_BASE}/${fileKey}`;
  try {
    const r = await fetch(directUrl, { headers: { 'User-Agent': 'Examanet-Internal/1.0' } });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
  } catch {}
  return null;
}

async function renderThumbnail(pdfBytes: Buffer): Promise<Buffer | null> {
  try {
    // Use pdfjs-dist legacy build for Node.js
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    const loadingTask = (pdfjs as any).getDocument({
      data: pdfBytes,
      disableAutoFetch: true,
      disableStream: true,
      isEvalSupported: false,
    });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const targetW = 300;
    const targetH = 400;
    const scale = Math.min(targetW / baseViewport.width, targetH / baseViewport.height);
    const viewport = page.getViewport({ scale });
    
    // Use canvas (Node.js native binding)
    let createCanvas;
    try {
      const c = await import('canvas');
      createCanvas = c.createCanvas;
    } catch (e: any) {
      console.error('canvas not available:', e.message);
      await pdf.destroy();
      return null;
    }
    
    const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    
    await page.render({
      canvasContext: ctx as any,
      viewport,
      canvas: canvas as any,
    } as any).promise;
    
    const jpegBuffer = canvas.toBuffer('image/jpeg', { quality: 0.8 });
    await pdf.destroy();
    return jpegBuffer;
  } catch (e: any) {
    console.error('renderThumbnail error:', e.message);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-internal-token');
  if (token !== INTERNAL_TOKEN) {
    return new NextResponse('Not found', { status: 404 });
  }
  
  try {
    const body = await req.json();
    const { fileKey, resourceId } = body;
    if (!fileKey || !resourceId) {
      return NextResponse.json({ error: 'fileKey and resourceId required' }, { status: 400 });
    }
    
    // 1. Download
    const pdfBytes = await downloadPdf(fileKey);
    if (!pdfBytes) {
      return NextResponse.json({ status: 'download_fail' });
    }
    
    // 2. Render
    const jpeg = await renderThumbnail(pdfBytes);
    if (!jpeg) {
      return NextResponse.json({ status: 'render_fail' });
    }
    
    // 3. Upload to blob
    const safeName = fileKey.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blob = await uploadFile(`thumbnails/${safeName}.jpg`, jpeg, 'image/jpeg');
    
    // 4. Update DB
    await prisma.resource.update({
      where: { id: resourceId },
      data: { thumbnailKey: blob.key, thumbnailUrl: blob.url },
    });
    
    return NextResponse.json({
      status: 'ok',
      thumbnailKey: blob.key,
      thumbnailUrl: blob.url,
      size: jpeg.length,
    });
  } catch (e: any) {
    return NextResponse.json({ status: 'error', error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-internal-token');
  if (token !== INTERNAL_TOKEN) {
    return new NextResponse('Not found', { status: 404 });
  }
  
  const total = await prisma.resource.count({
    where: { thumbnailKey: null, fileKey: { not: null } },
  });
  const withThumb = await prisma.resource.count({
    where: { thumbnailKey: { not: null } },
  });
  return NextResponse.json({
    without_thumbnail: total,
    with_thumbnail: withThumb,
    total: withThumb + total,
    percent: Math.round(withThumb * 100 / (withThumb + total)),
  });
}
