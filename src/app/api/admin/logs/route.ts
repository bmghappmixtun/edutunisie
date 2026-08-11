import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/logs
 * 
 * Live view of Vercel runtime logs stored from the log drain.
 * 
 * Query params:
 * - level: filter by level (error, warning, info)
 * - since: ISO timestamp (default: 1h ago)
 * - until: ISO timestamp (default: now)
 * - limit: max results (default 50, max 500)
 * - path: filter by request path (contains)
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const level = url.searchParams.get('level');
  const sinceParam = url.searchParams.get('since');
  const untilParam = url.searchParams.get('until');
  const limit = Math.min(500, parseInt(url.searchParams.get('limit') || '50'));
  const pathFilter = url.searchParams.get('path');
  
  const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 60 * 60 * 1000);
  const until = untilParam ? new Date(untilParam) : new Date();
  
  // Build the where clause using raw SQL because the Prisma client
  // might not have the VercelLog model generated yet
  const conditions = ['timestamp BETWEEN $1 AND $2'];
  const params: any[] = [since, until];
  let paramIdx = 3;
  
  if (level) {
    conditions.push(`level = $${paramIdx++}`);
    params.push(level);
  }
  if (pathFilter) {
    conditions.push(`"requestPath" ILIKE $${paramIdx++}`);
    params.push(`%${pathFilter}%`);
  }
  
  const sql = `
    SELECT 
      id, "externalId", timestamp, level, source, domain,
      "requestMethod", "requestPath", "responseStatusCode",
      "requestId", environment, branch, cache,
      LEFT(message, 2000) as message,
      reviewed, "createdAt"
    FROM "VercelLog"
    WHERE ${conditions.join(' AND ')}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;
  
  try {
    const logs = await prisma.$queryRawUnsafe(sql, ...params);
    
    // Get counts by level
    const counts = await prisma.$queryRaw<{level: string, count: bigint}[]>`
      SELECT level, COUNT(*) as count
      FROM "VercelLog"
      WHERE timestamp BETWEEN ${since} AND ${until}
      GROUP BY level
    `;
    
    return NextResponse.json({
      ok: true,
      range: { since, until },
      counts: counts.map(c => ({ level: c.level, count: Number(c.count) })),
      logs,
    });
  } catch (e) {
    return NextResponse.json({ 
      error: 'Query failed',
      detail: (e as Error).message,
    }, { status: 500 });
  }
}
