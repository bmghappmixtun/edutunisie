import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * DB Sync endpoint — called by Vercel Cron to auto-heal
 * if the Neon password was rotated by another agent/project.
 *
 * Flow:
 * 1. Get current password from Neon (by resetting the role)
 * 2. Update Vercel env with the new DATABASE_URL
 * 3. Trigger a redeploy via Vercel deploy hook
 * 4. Return 200 with status
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
    const deployHook = process.env.VERCEL_DEPLOY_HOOK!;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID!;
    const envProd = process.env.VERCEL_ENV_PROD!;
    const envPreview = process.env.VERCEL_ENV_PREVIEW!;

    const PROJECT_ID = 'little-silence-94324724';
    const BRANCH_ID = 'br-purple-recipe-as2x8yyo';
    const ROLE = 'neondb_owner';
    const HOST = 'ep-round-art-asyh88wq-pooler.c-4.eu-central-1.aws.neon.tech';
    const DB = 'neondb';

    // Step 1: Reset password to get the current one
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

    // Step 2: Build new DATABASE_URL
    const newUrl = `postgresql://neondb_owner:${newPass}@${HOST}/${DB}?sslmode=require`;

    // Step 3: Update Vercel env (prod + preview)
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

    // Step 4: Trigger redeploy
    const deployRes = await fetch(
      `https://api.vercel.com/v1/integrations/deploy/${vercelProjectId}/${deployHook}`,
      { method: 'POST', headers: { Authorization: `Bearer ${vercelToken}` } }
    );
    results.steps.push({ step: 'redeploy', ok: deployRes.ok, status: deployRes.status });

    results.duration = Date.now() - start;
    return NextResponse.json({ ok: true, ...results });
  } catch (err: any) {
    results.error = err?.message;
    results.duration = Date.now() - start;
    return NextResponse.json({ ok: false, ...results }, { status: 500 });
  }
}
