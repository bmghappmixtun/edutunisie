import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Detect Cloudflare Workers via OpenNext's __cloudflare-context__ symbol
  // (set on globalThis by .open-next/cloudflare/init.js)
  // @ts-ignore
  const cfContext = globalThis[Symbol.for('__cloudflare-context__')];
  const isCF = !!cfContext;

  if (isCF) {
    return NextResponse.json({
      ok: true,
      platform: 'cloudflare-workers',
      note: 'Limited health (no DB query) - Prisma 5.x binary engine limitation. Fixed by Prisma 6+ WASM engine upgrade (see PR #1).',
      timestamp: new Date().toISOString(),
    });
  }

  // Vercel: full health check via Prisma
  try {
    const { checkDbHealth } = await import('./db-check');
    const result = await checkDbHealth();
    return NextResponse.json({
      ok: true,
      platform: 'vercel',
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
