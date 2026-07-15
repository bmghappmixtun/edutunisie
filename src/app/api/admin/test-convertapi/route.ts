/**
 * Temporary API: Test ConvertAPI with a public DOCX URL
 *
 * POST /api/admin/test-convertapi
 * Body: { url: "https://...", filename?: "test.docx" }
 *
 * Decrypts the apiconvert token from DB (using production key),
 * calls ConvertAPI, and returns the PDF as base64.
 *
 * DELETE THIS FILE AFTER TESTING.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidOrigin, isProduction } from '@/lib/security';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptSecret } from '@/lib/provider-keys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!isValidOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { url, filename } = await req.json();
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return NextResponse.json({ error: 'url required' }, { status: 400 });
  }

  // 1. Decrypt the apiconvert token from DB
  const provider = await prisma.apiProvider.findFirst({ where: { provider: 'apiconvert' } });
  if (!provider || !provider.secretKey) {
    return NextResponse.json({ error: 'APIConvert not configured' }, { status: 404 });
  }
  const token = decryptSecret(provider.secretKey);
  if (!token) {
    return NextResponse.json({ error: 'Failed to decrypt APIConvert token' }, { status: 500 });
  }

  // 2. Call ConvertAPI
  const apiUrl = provider.apiUrl || 'https://v2.convertapi.com';
  const endpoint = `${apiUrl}/convert/docx/to/pdf`;

  const startTime = Date.now();
  const formData = new FormData();
  formData.append('Url', url);
  if (filename) {
    formData.append('FileName', filename);
  }

  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });

  const elapsed = Date.now() - startTime;
  const contentType = r.headers.get('content-type') || '';

  // ConvertAPI returns either:
  // - JSON: { Code, Message, Cost, Files: [{ FileName, FileData (base64), FileUrl? }] }
  // - PDF binary directly
  if (contentType.includes('application/json')) {
    const json = await r.json();
    if (json.Files?.[0]?.FileData) {
      const pdfBuffer = Buffer.from(json.Files[0].FileData, 'base64');
      return NextResponse.json({
        success: true,
        elapsedMs: elapsed,
        cost: json.Cost,
        code: json.Code,
        pdfBase64: pdfBuffer.toString('base64'),
        pdfSizeKB: Math.round(pdfBuffer.length / 1024),
        filename: json.Files[0].FileName,
      });
    }
    return NextResponse.json({ success: false, error: json.Message || 'Unknown error', elapsedMs: elapsed, response: json });
  } else {
    // Binary response
    const pdfBuffer = Buffer.from(await r.arrayBuffer());
    return NextResponse.json({
      success: true,
      elapsedMs: elapsed,
      pdfBase64: pdfBuffer.toString('base64'),
      pdfSizeKB: Math.round(pdfBuffer.length / 1024),
    });
  }
}
