import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * STRICT health check endpoint.
 *
 * Returns 503 when the DB is unreachable. This is the OLD behavior of
 * /api/health, kept as a separate endpoint for callers that really need
 * the strict status code (e.g., alerting that triggers on 5xx).
 *
 * Most callers should use /api/health (fail-soft) instead — see the
 * comment in that file for the rationale.
 */
export async function GET() {
  const start = Date.now();
  try {
    await prisma.resource.count({ take: 1 });
    return NextResponse.json({
      ok: true,
      dbLatency: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || 'Unknown error',
        code: err?.code,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
