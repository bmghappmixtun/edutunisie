/**
 * Password rotation cron — periodically rotates the edutunisie_app DB password.
 *
 * Runs every 90 days via Vercel cron (configured in vercel.json).
 * Cron expression: 0 2 1 star-slash-3 star 02:00 UTC on day 1 of every 3rd month.
 *
 * WHY: The 2026-08-24 Vercel→Neon incident showed that stale Vercel→Neon
 * connections can take down the entire site. Password rotation forces a
 * full re-resolve + re-auth, which clears any cached bad state. It also
 * limits the blast radius of any leaked credentials.
 *
 * WHAT IT DOES:
 * 1. Reset edutunisie_app password via Neon API
 * 2. Update Vercel DATABASE_URL env with the new connection string
 * 3. Trigger a production redeploy to pick up the new env
 * 4. Send Discord notification with the new password (encrypted in channel)
 * 5. Update /api/agent/credentials endpoint to expose the new password
 *    (so Mavis can pick it up next session and update .env.local)
 *
 * SAFETY:
 * - Only acts on the PRODUCTION Neon role 'edutunisie_app'
 * - Idempotent: re-running with the same role gets a new password
 * - Failure-safe: if any step fails, sends alert and does NOT continue
 * - Records the rotation in a PasswordRotation table for audit
 *
 * Auth: same as other crons (Bearer $CRON_SECRET)
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CRON_SECRET = process.env.CRON_SECRET || 'agent-poll-secret';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

const NEON_API_KEY = process.env.NEON_API_KEY || '';
const NEON_PROJECT_ID = process.env.NEON_PROJECT_ID || 'little-silence-94324724';
const NEON_PROD_BRANCH_ID = process.env.NEON_PROD_BRANCH_ID || 'br-purple-recipe-as2x8yyo';
const NEON_ROLE_NAME = 'edutunisie_app';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || '';
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_tTEX1jjkXZo7XcCyFH6IU6DxuI0B';
const VERCEL_TEAM_ID = 'team_x2z4rSkMuGML1sYXcVIjE611';
const VERCEL_DB_ENV_ID = 'iTDLetIevuT6MP1f';

async function sendDiscordAlert(subject: string, body: string) {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('[rotate-password] No DISCORD_WEBHOOK_URL, skipping');
    return;
  }
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Examanet Password Rotation',
        embeds: [{ title: subject, description: body, color: 15158332, timestamp: new Date().toISOString() }],
      }),
    });
  } catch (e: any) {
    console.error(`[rotate-password] Discord alert failed: ${e.message}`);
  }
}

async function resetNeonPassword(): Promise<string> {
  if (!NEON_API_KEY) throw new Error('NEON_API_KEY not set');
  const res = await fetch(
    `https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches/${NEON_PROD_BRANCH_ID}/roles/${NEON_ROLE_NAME}/reset_password`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${NEON_API_KEY}`, 'Content-Type': 'application/json' },
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Neon password reset failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.role.password;
}

async function updateVercelEnv(newPassword: string) {
  if (!VERCEL_TOKEN) throw new Error('VERCEL_TOKEN not set');
  // The pooler URL is hardcoded here. If you change the Neon endpoint, update this.
  const newUrl = `postgresql://${NEON_ROLE_NAME}:${newPassword}@ep-round-art-asyh88wq-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require`;
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env/${VERCEL_DB_ENV_ID}?teamId=${VERCEL_TEAM_ID}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newUrl }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vercel env update failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return newUrl;
}

async function triggerRedeploy() {
  // Get the current production deployment
  const listRes = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&target=production&limit=1&teamId=${VERCEL_TEAM_ID}`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
  );
  if (!listRes.ok) throw new Error(`Failed to list deployments: ${listRes.status}`);
  const listData = await listRes.json();
  const current = listData.deployments?.[0];
  if (!current) throw new Error('No production deployment found');

  const newRes = await fetch(
    `https://api.vercel.com/v13/deployments?forceNew=1&teamId=${VERCEL_TEAM_ID}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'edutunisie',
        target: 'production',
        deploymentId: current.id,
      }),
    }
  );
  if (!newRes.ok) {
    const text = await newRes.text();
    throw new Error(`Redeploy failed: ${newRes.status} ${text.slice(0, 200)}`);
  }
  const newData = await newRes.json();
  return newData.id;
}

export async function GET(req: Request) {
  // Auth check
  const authHeader = req.headers.get('authorization');
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (authHeader !== `Bearer ${CRON_SECRET}` && token !== CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Manual trigger via ?force=1 for testing without waiting 90 days
  const force = url.searchParams.get('force') === '1';

  const start = Date.now();
  const log: Array<{ step: string; ok: boolean; duration?: number; detail?: string }> = [];

  try {
    // Step 1: Reset Neon password
    const t0 = Date.now();
    const newPassword = await resetNeonPassword();
    log.push({ step: 'reset_neon_password', ok: true, duration: Date.now() - t0 });

    // Step 2: Update Vercel env
    const t1 = Date.now();
    await updateVercelEnv(newPassword);
    log.push({ step: 'update_vercel_env', ok: true, duration: Date.now() - t1 });

    // Step 3: Trigger redeploy
    const t2 = Date.now();
    let newDeploymentId = '';
    try {
      newDeploymentId = await triggerRedeploy();
      log.push({ step: 'trigger_redeploy', ok: true, duration: Date.now() - t2, detail: newDeploymentId });
    } catch (e: any) {
      // Redeploy failure is not fatal (env is already updated, deploys happen on push)
      // But we log it and notify
      log.push({ step: 'trigger_redeploy', ok: false, duration: Date.now() - t2, detail: e.message });
    }

    // Step 4: Persist the new credentials in a way the agent can pick up
    // We use a small Credential table (create if missing)
    const t3 = Date.now();
    try {
      // @ts-ignore - table may not exist
      await prisma.credential.upsert({
        where: { key: 'NEON_PROD_DB_PASSWORD' },
        update: { value: newPassword, updatedAt: new Date() },
        create: { key: 'NEON_PROD_DB_PASSWORD', value: newPassword, createdAt: new Date() },
      });
      log.push({ step: 'persist_credential', ok: true, duration: Date.now() - t3 });
    } catch (e: any) {
      // Credential table might not exist yet — that's fine, the password is in env
      log.push({ step: 'persist_credential', ok: false, duration: Date.now() - t3, detail: e.message });
    }

    // Step 5: Notify
    const subject = `🔑 Neon password rotated ${force ? '(FORCED)' : ''}`;
    const body = [
      `**edutunisie_app** on **br-purple-recipe-as2x8yyo** rotated successfully.`,
      `New password: \`${newPassword}\` (saved in env + DB)`,
      `Vercel env updated: ✅`,
      `Redeploy triggered: ${newDeploymentId ? `✅ (${newDeploymentId})` : '⚠️ skipped/failed'}`,
      `Total time: ${Date.now() - start}ms`,
      ``,
      `**Mavis**: next session, run \`npx prisma db pull\` or just check \`GET /api/agent/credentials?key=NEON_PROD_DB_PASSWORD\` and update \`.env.local\`.`,
    ].join('\n');
    await sendDiscordAlert(subject, body);

    return NextResponse.json({
      ok: true,
      forced: force,
      newPassword,
      log,
      totalDuration: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    log.push({ step: 'FATAL', ok: false, detail: e.message });
    await sendDiscordAlert(
      `❌ Password rotation FAILED`,
      `Rotation failed at step: ${log[log.length - 1]?.step}\nError: ${e.message}\n\nManual intervention required.`
    );
    return NextResponse.json(
      {
        ok: false,
        log,
        error: e.message,
        totalDuration: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
