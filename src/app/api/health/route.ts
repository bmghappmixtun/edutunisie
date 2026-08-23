import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
// Note: no `export const runtime` - this lets the route use the deployment's
// default runtime. On Vercel this is nodejs (works), on Cloudflare Workers
// this is the Workers runtime (also works because prisma uses PrismaPg).
// We previously had `runtime = 'nodejs'` here which failed on CF because
// OpenNext Cloudflare adapter doesn't expose the Node.js runtime, causing
// Prisma's native binary engine to try to load and crash with
// `[unenv] fs.readdir is not implemented yet!`.

/**
 * Health check endpoint
 * - Returns 200 if DB is reachable
 * - Returns 503 if DB is down
 * - Used by Vercel Cron to keep Neon compute warm + detect issues
 * - Also used by Cloudflare Workers for health monitoring
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
