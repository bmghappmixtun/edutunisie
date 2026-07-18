import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Health check endpoint
 * - Returns 200 if DB is reachable
 * - Returns 503 if DB is down
 * - Used by Vercel Cron to keep Neon compute warm + detect issues
 */
export async function GET() {
  const start = Date.now();
  try {
    // Simple count query
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
