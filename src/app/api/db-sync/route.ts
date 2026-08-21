import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * DB Sync endpoint — Vercel Cron auto-heal for Neon password.
 *
 * Optimized 2026-08-21: skip Vercel env update when password unchanged
 * and removed the deploy hook (was costing $67/mo in unnecessary rebuilds).
 *
 * Flow:
 * 1. Read current Vercel env DATABASE_URL
 * 2. Reset Neon password (only way to get current value via API)
 * 3. If new password == current Vercel password, skip update
 * 4. Otherwise update Vercel env (prod + preview) — NO redeploy
 * 5. Next cold start picks up new env var automatically
 *
 * Schedule (vercel.json): 0 8,20 * * * — twice daily at 8am and 8pm UTC
 *
 * Protected by CRON_SECRET (Vercel Cron sends Authorization: Bearer ${CRON_SECRET})
 */
export async function GET(req: Request) {
  // Vercel Cron sends Authorization: Bearer ${CRON_SECRET}
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const start = Date.now();
  const results: any = {
    steps: [],
    duration: 0,
  };

  try {
    const neonKey = process.env.NEON_API_KEY!;
    const vercelToken = process.env.VERCEL_TOKEN!;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID!;
    const envProd = process.env.VERCEL_ENV_PROD!;
    const envPreview = process.env.VERCEL_ENV_PREVIEW!;

    const PROJECT_ID = 'little-silence-94324724';
    const BRANCH_ID = 'br-purple-recipe-as2x8yyo';
    const ROLE = 'neondb_owner';
    const HOST = 'ep-round-art-asyh88wq-pooler.c-4.eu-central-1.aws.neon.tech';
    const DB = 'neondb';

    // Step 1: Read current Vercel env DATABASE_URL
    const envRes = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectId}/env/${envProd}`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    );
    const envData = await envRes.json();
    const currentUrl: string = envData?.value || '';
    const passMatch = currentUrl.match(/:[^:@]+@/);
    const currentPass = passMatch ? passMatch[0].slice(1, -1) : '';
    results.steps.push({ step: 'read_vercel_env', ok: !!currentPass, passPrefix: currentPass.slice(0, 8) });

    if (!currentPass) {
      results.error = 'Could not read current Vercel DATABASE_URL';
      return NextResponse.json({ ...results, ok: false }, { status: 500 });
    }

    // Step 2: Reset Neon password (only way to get current value via API)
    const resetRes = await fetch(
      `https://console.neon.tech/api/v2/projects/${PROJECT_ID}/branches/${BRANCH_ID}/roles/${ROLE}/reset_password`,
      { method: 'POST', headers: { Authorization: `Bearer ${neonKey}` } }
    );
    const resetData = await resetRes.json();
    const newPass = resetData?.role?.password;

    if (!newPass) {
      results.steps.push({ step: 'reset_password', ok: false, error: 'no password in response' });
      return NextResponse.json({ ...results, ok: false }, { status: 500 });
    }
    results.steps.push({ step: 'reset_password', ok: true });
    results.newPasswordPrefix = newPass.slice(0, 8);

    // Step 3: If password unchanged, skip everything (no-op, no Vercel updates)
    if (newPass === currentPass) {
      results.steps.push({ step: 'no_change', ok: true, message: 'password unchanged, skipping Vercel update' });
      results.changed = false;
      results.duration = Date.now() - start;
      return NextResponse.json({ ok: true, ...results });
    }

    // Step 4: Build new DATABASE_URL and update Vercel env (prod + preview)
    // NO redeploy — env vars are picked up on next cold start
    const newUrl = `postgresql://${ROLE}:${newPass}@${HOST}/${DB}?sslmode=require`;

    for (const [envId, target] of [[envProd, 'production'], [envPreview, 'preview']]) {
      const patchRes = await fetch(
        `https://api.vercel.com/v9/projects/${vercelProjectId}/env/${envId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ value: newUrl, type: 'encrypted', target: [target] }),
        }
      );
      results.steps.push({ step: `update_vercel_${target}`, ok: patchRes.ok });
    }

    results.changed = true;
    results.message = 'Password rotated and Vercel env updated. Next cold start will use new password.';
    results.duration = Date.now() - start;
    return NextResponse.json({ ok: true, ...results });
  } catch (err: any) {
    results.error = err?.message;
    results.duration = Date.now() - start;
    return NextResponse.json({ ok: false, ...results }, { status: 500 });
  }
}
