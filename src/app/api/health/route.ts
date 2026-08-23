import { NextResponse } from 'next/server';

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
 * - On Vercel: returns 200 if DB is reachable, 503 if DB is down
 * - On Cloudflare Workers: returns 200 with limited health (no Prisma query,
 *   because Prisma 5.22's binary engine still tries to load even with
 *   the driver adapter on Workers). The CF worker's health check
 *   intentionally avoids the Prisma query to keep the endpoint stable.
 * - Used by Vercel Cron to keep Neon compute warm + detect issues
 *
 * Note (2026-08-23): The `globalThis.HYPERDRIVE` check below determines
 * which platform we're on. On Vercel, we do the full DB health check.
 * On Cloudflare Workers, we skip the Prisma call because the binary
 * engine init still fails there (Prisma 5.x limitation, see PR #1).
 * This will be fully fixed when we upgrade to Prisma 6+ WASM engine.
 */
export async function GET() {
  const start = Date.now();
  const isCF = typeof (globalThis as any).HYPERDRIVE !== 'undefined';

  // Cloudflare Workers: limited health check, no Prisma
  if (isCF) {
    return NextResponse.json({
      ok: true,
      platform: 'cloudflare-workers',
      note: 'Limited health (no DB query) due to Prisma 5.x binary engine limitation on Workers',
      timestamp: new Date().toISOString(),
    });
  }

  // Vercel: full health check via Prisma
  const { prisma } = await import('@/lib/prisma');
  try {
    await prisma.resource.count({ take: 1 });
    return NextResponse.json({
      ok: true,
      platform: 'vercel',
      dbLatency: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        platform: 'vercel',
        error: err?.message || 'Unknown error',
        code: err?.code,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
