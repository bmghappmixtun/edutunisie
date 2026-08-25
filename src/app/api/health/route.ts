import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Detect Cloudflare Workers via OpenNext's __cloudflare-context__ symbol
  // (set on globalThis by .open-next/cloudflare/init.js)
  // @ts-ignore
  const cfContext = globalThis[Symbol.for('__cloudflare-context__')];
  const isCF = !!cfContext;

  if (isCF) {
    // CF POC: do REAL DB queries via the Drizzle proxy to verify
    // Hyperdrive connection + query pipeline. Each test mimics a
    // different page query shape so silent failures don't go unnoticed.
    try {
      const { prisma } = await import('@/lib/prisma');
      const start = Date.now();
      // Test 1: count all
      const countAll = await prisma.resource.count({});
      // Test 2: count with status filter
      const countPublished = await prisma.resource.count({ where: { status: 'PUBLISHED' } });
      // Test 3: findFirst (simple)
      const sample = await prisma.resource.findFirst({
        select: { id: true, title: true, status: true },
      });
      // Test 4: findMany with where (simple)
      const findManyResult = await prisma.resource.findMany({
        where: { status: 'PUBLISHED' },
        take: 5,
        select: { id: true, title: true, status: true },
      });
      // Test 5: findMany with select+_count (the actual /fr/ressources query shape)
      const findManyWithCount = await prisma.resource.findMany({
        where: { status: 'PUBLISHED' },
        take: 24,
        select: {
          id: true, slug: true, title: true, type: true, language: true, status: true,
          _count: { select: { comments: true, ratings: true, favorites: true } },
        },
      });
      const dbLatency = Date.now() - start;
      return NextResponse.json({
        ok: true,
        platform: 'cloudflare-workers',
        db: {
          ok: true,
          latency: dbLatency,
          countAll,
          countPublished,
          findFirstId: sample?.id || null,
          findFirstTitle: sample?.title?.slice(0, 50) || null,
          findFirstStatus: sample?.status || null,
          findManyCount: Array.isArray(findManyResult) ? findManyResult.length : 'not-array',
          findManyFirstTitle: (findManyResult as any[])?.[0]?.title?.slice(0, 50) || null,
          // Test 5 results (this is what /fr/ressources actually runs)
          findManyWithCountLength: Array.isArray(findManyWithCount) ? findManyWithCount.length : 'not-array',
          findManyWithCountFirstTitle: (findManyWithCount as any[])?.[0]?.title?.slice(0, 50) || null,
          findManyWithCountFirstComments: (findManyWithCount as any[])?.[0]?._count?.comments ?? null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      return NextResponse.json({
        ok: true, // fail-soft: 200 with body indicating problem
        platform: 'cloudflare-workers',
        db: { ok: false, error: e?.message || String(e) },
        timestamp: new Date().toISOString(),
      });
    }
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
