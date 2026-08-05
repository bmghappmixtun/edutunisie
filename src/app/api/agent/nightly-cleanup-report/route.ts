/**
 * One-off endpoint to send the nightly-cleanup summary report to Discord.
 *
 * Triggered manually by Mavis from the sandbox (which doesn't have the
 * DISCORD_WEBHOOK_URL env var — it's encrypted in Vercel). This route
 * runs in the deployed Vercel environment where the env is available.
 *
 * Usage (from sandbox):
 *   curl -X POST https://examanet.com/api/agent/nightly-cleanup-report \
 *     -H "Content-Type: application/json" \
 *     -d '{"report": {...}}'
 *
 * This endpoint can be removed after the summary is sent (commit a delete).
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
const EXPECTED_TOKEN = process.env.AGENT_REPORT_TOKEN || '';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!EXPECTED_TOKEN || auth !== `Bearer ${EXPECTED_TOKEN}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!DISCORD_WEBHOOK_URL) {
    return NextResponse.json({ error: 'DISCORD_WEBHOOK_URL not set' }, { status: 500 });
  }

  const body = await req.json();
  const report = body?.report;

  if (!report) {
    return NextResponse.json({ error: 'missing report' }, { status: 400 });
  }

  try {
    const res = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    const text = await res.text();
    return NextResponse.json({ ok: res.ok, status: res.status, response: text.slice(0, 200) });
  } catch (e: any) {
    return NextResponse.json({ error: 'fetch failed', message: e?.message }, { status: 500 });
  }
}
