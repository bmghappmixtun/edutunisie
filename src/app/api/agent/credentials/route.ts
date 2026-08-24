/**
 * Agent credentials endpoint — exposes the latest DB password to Mavis.
 *
 * After the password rotation cron (src/app/api/cron/rotate-password) runs,
 * it stores the new password in the `Credential` table. Mavis can then
 * call this endpoint to fetch the latest value and update `.env.local`.
 *
 * SECURITY:
 * - Protected by Bearer $AGENT_REPORT_TOKEN (same as other agent endpoints)
 * - Returns values in plaintext (this is a dev/internals endpoint)
 * - DO NOT expose publicly — only Mavis uses this
 *
 * Usage:
 *   GET /api/agent/credentials                          → list all keys
 *   GET /api/agent/credentials?key=NEON_PROD_DB_PASSWORD → single value
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AGENT_TOKEN = process.env.AGENT_REPORT_TOKEN || 'agent-nightly-2026-07-29-mavis';

export async function GET(req: NextRequest) {
  // Auth
  const authHeader = req.headers.get('authorization');
  const token = req.nextUrl.searchParams.get('token');
  if (authHeader !== `Bearer ${AGENT_TOKEN}` && token !== AGENT_TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const key = req.nextUrl.searchParams.get('key');

  try {
    if (key) {
      // @ts-ignore - table may not exist
      const row = await prisma.credential.findUnique({ where: { key } });
      if (!row) {
        return NextResponse.json({ ok: false, error: `No credential for key "${key}"` }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        key: row.key,
        value: row.value,
        updatedAt: row.updatedAt,
      });
    } else {
      // List all keys (without values) — useful for Mavis to discover what's stored
      // @ts-ignore - table may not exist
      const rows = await prisma.credential.findMany({
        select: { key: true, updatedAt: true },
        orderBy: { key: 'asc' },
      });
      return NextResponse.json({ ok: true, credentials: rows });
    }
  } catch (e: any) {
    // If the Credential table doesn't exist, return empty list (no error)
    if (e?.code === 'P2021' || /does not exist/i.test(e?.message || '')) {
      return NextResponse.json({ ok: true, credentials: [], note: 'Credential table not yet created' });
    }
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
