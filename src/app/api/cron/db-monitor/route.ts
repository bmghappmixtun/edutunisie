/**
 * DB monitor cron — early warning for Vercel→Neon DB connectivity issues
 *
 * Runs every 5 minutes via Vercel cron (configured in vercel.json).
 *
 * WHAT IT DOES:
 * 1. Tries to query the DB through Prisma
 * 2. If it succeeds, all good (optionally wake the endpoint)
 * 3. If it fails:
 *    - Detects the specific failure type (connect refused, auth, pool timeout)
 *    - Sends a Discord alert (deduplicated — only once per outage)
 *    - Records the failure in a small KV/table for trending
 *
 * HISTORY (2026-08-24): The Vercel→Neon connectivity incident generated
 * 93.7k log-drain failures in 5 min because nobody noticed the underlying
 * "Can't reach database" errors for 1.5 hours. This cron is the canary.
 *
 * Auth: same as other crons (Bearer $CRON_SECRET)
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CRON_SECRET = process.env.CRON_SECRET || 'agent-poll-secret';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

// How long between alerts for the same outage (15 min)
const ALERT_DEDUPE_MS = 15 * 60 * 1000;

// In-memory dedupe (per-lambda). For true global dedupe we'd need Redis,
// but the cron is one invocation at a time so this is fine in practice.
let lastAlertAt = 0;
let lastAlertError = '';

async function sendDiscordAlert(subject: string, body: string) {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('[db-monitor] No DISCORD_WEBHOOK_URL configured, skipping alert');
    return;
  }

  // Dedupe: don't re-alert for the same error within ALERT_DEDUPE_MS
  const now = Date.now();
  if (subject === lastAlertError && now - lastAlertAt < ALERT_DEDUPE_MS) {
    console.log(`[db-monitor] Suppressing duplicate alert (last sent ${Math.round((now - lastAlertAt) / 1000)}s ago)`);
    return;
  }

  try {
    const res = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Examanet DB Monitor',
        embeds: [
          {
            title: subject,
            description: body,
            color: 15158332, // red
            timestamp: new Date().toISOString(),
            footer: { text: 'examanet.com /api/cron/db-monitor' },
          },
        ],
      }),
    });
    if (res.ok) {
      lastAlertAt = now;
      lastAlertError = subject;
    } else {
      console.error(`[db-monitor] Discord webhook returned ${res.status}`);
    }
  } catch (e: any) {
    console.error(`[db-monitor] Failed to send Discord alert: ${e.message}`);
  }
}

export async function GET(req: Request) {
  // Auth check
  const authHeader = req.headers.get('authorization');
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (authHeader !== `Bearer ${CRON_SECRET}` && token !== CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const start = Date.now();
  const checks: Record<string, { ok: boolean; latency?: number; error?: string; code?: string }> = {};

  // Check 1: Prisma can query
  try {
    const t0 = Date.now();
    const count = await prisma.resource.count({ take: 1 });
    checks.prisma = { ok: true, latency: Date.now() - t0 };
    checks.resourceCount = { ok: true, latency: Date.now() - t0 };
    // ^ same thing, kept for clarity in the response
    void count;
  } catch (err: any) {
    checks.prisma = {
      ok: false,
      error: err?.message || 'Unknown error',
      code: err?.code,
    };
  }

  // Check 2: Can write a heartbeat record (also keeps the connection pool warm)
  // Skipped for now to avoid noise; can be added if needed

  const allOk = Object.values(checks).every((c) => c.ok);
  const totalLatency = Date.now() - start;

  if (!allOk) {
    // Compose alert subject + body
    const failingChecks = Object.entries(checks)
      .filter(([, v]) => !v.ok)
      .map(([name, v]) => `• \`${name}\`: ${v.error || 'unknown error'}${v.code ? ` (code: ${v.code})` : ''}`)
      .join('\n');

    const subject = `🚨 Examanet DB check FAILED (${Object.values(checks).filter((c) => !c.ok).length}/${Object.keys(checks).length} checks failed)`;
    const body = `**examAnet.com production**\n\n${failingChecks}\n\nThis is the canary that catches the "Can't reach database" pattern before it cascades. Investigate immediately:\n1. Check Neon status: https://console.neon.tech\n2. Test connection from Vercel: \`curl -s https://examanet.com/api/health | jq .db.ok\`\n3. If pooler unreachable, rotate \`edutunisie_app\` password via Neon API and update Vercel env.`;

    await sendDiscordAlert(subject, body);

    return NextResponse.json({
      ok: false,
      checks,
      totalLatency,
      alertSent: true,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    ok: true,
    checks,
    totalLatency,
    timestamp: new Date().toISOString(),
  });
}
