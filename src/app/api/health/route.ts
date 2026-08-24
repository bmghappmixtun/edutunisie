import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Health check endpoint — FAIL-SOFT pattern (2026-08-24)
 *
 * HISTORY: Before this change, /api/health returned 503 when the DB was
 * unreachable. That was correct in spirit (real health check), but it had
 * a few problems:
 *   1. The Vercel cron (`0 6 * * *`) used this endpoint to keep the Neon
 *      compute warm. When the DB was down, the cron logged a noisy 5xx
 *      which then triggered log-drain failures (the very feedback loop we
 *      just patched in commit 5215065).
 *   2. Uptime monitors (UptimeRobot, BetterStack, etc.) only check the HTTP
 *      status code, so they would alert-flood when the DB blipped.
 *   3. Real users never see this endpoint, so the strict status code only
 *      hurt us operationally.
 *
 * NEW BEHAVIOR (fail-soft):
 *   - Always returns HTTP 200
 *   - Body has the real status: { ok: true, db: { ok: true, latency } } when
 *     everything is fine, or { ok: true, db: { ok: false, error } } when not.
 *   - The HTTP-level "this endpoint works" is decoupled from the
 *     application-level "DB is healthy".
 *
 * UPTIME MONITORS: If you're using one, update it to check the body's
 * `db.ok` field instead of the HTTP status code. Or use /api/health/strict
 * (below) for a hard 503 when you really need it.
 *
 * STRICT VARIANT: /api/health/strict still returns 503 when the DB is down
 * for callers that need the old strict behavior.
 */
export async function GET() {
  const start = Date.now();
  try {
    await prisma.resource.count({ take: 1 });
    return NextResponse.json({
      ok: true,
      db: {
        ok: true,
        latency: Date.now() - start,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    // FAIL-SOFT: 200 with degraded=true so monitoring tools don't alert-flood
    // Real monitoring should check the body's db.ok field
    return NextResponse.json({
      ok: true,
      degraded: true,
      db: {
        ok: false,
        error: err?.message || 'Unknown error',
        code: err?.code,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
