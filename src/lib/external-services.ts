/**
 * External service usage checkers (ConvertAPI, iLovePDF, Neon)
 *
 * Each function returns the current period usage (count, unit, limit where
 * available) so the admin panel can show real-time quota.
 *
 * ConvertAPI: https://docs.convertapi.com/
 *   - GET /v2/user → {ConversionsTotal, ConversionsConsumed, Active, Email, ...}
 *   - GET /v2/user/statistic?startDate&endDate → daily breakdown
 *
 * iLovePDF: https://www.iloveapi.com/docs/api-reference
 *   - JWT self-signed (1h expiry) using public_key + secret_key
 *   - GET /v1/start/{tool}/eu-1 → returns task with remainingFiles
 *   - Use 'merge' (cheapest tool) to check quota
 *
 * Neon: https://neon.tech/docs/manage/api-keys
 *   - GET /api/v2/projects → list all projects
 *   - GET /api/v2/consumption_history/v2/projects?from&to&granularity&metrics&org_id
 *     Returns storage (root_branch_bytes_month, child_branch_bytes_month)
 *     and compute (compute_unit_seconds)
 */

import { createHmac } from 'crypto';

// ============================================================================
// SHARED TYPES
// ============================================================================

export type ProviderUsage = {
  // Identifies which endpoint gave us the data (for the UI)
  source: string;
  // Account / plan info
  username?: string;
  email?: string;
  plan?: string;
  active?: boolean;
  // Quota (for conversion providers)
  quota?: { used: number; total: number; remaining: number; percent: number };
  // Vercel-style flat usage
  bandwidth?: { used: number; unit: string };
  functions?: { used: number; unit: string };
  builds?: { used: number; unit: string };
  // Neon-style consumption
  storage?: { usedMb: number; unit: string };
  compute?: { usedHours: number; unit: string };
  transfer?: { usedGb: number; unit: string };
  projects?: { active: number };
  branches?: { active: number };
  // Period (for display)
  periodStart?: string;
  periodEnd?: string;
  // Error
  error?: string;
};

// ============================================================================
// CONVERTAPI
// ============================================================================
// Docs: https://docs.convertapi.com/docs/user-information
// Endpoint: GET https://v2.convertapi.com/user
// Auth: Authorization: Bearer <token>

export async function checkConvertApiUsage(token: string): Promise<ProviderUsage> {
  if (!token) {
    return { source: 'convertapi/user', error: 'No APIConvert token configured' };
  }

  try {
    const res = await fetch('https://v2.convertapi.com/user', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        source: 'convertapi/user',
        error: `APIConvert ${res.status}: ${errText.slice(0, 200)}`,
      };
    }
    const data: any = await res.json();
    const total = data.ConversionsTotal || 0;
    const consumed = data.ConversionsConsumed || 0;
    const remaining = Math.max(0, total - consumed);
    const percent = total > 0 ? Math.round((consumed / total) * 100) : 0;
    return {
      source: 'convertapi/user',
      active: data.Active,
      email: data.Email,
      username: data.FullName,
      quota: { used: consumed, total, remaining, percent },
    };
  } catch (e: any) {
    return { source: 'convertapi/user', error: `Network: ${e?.message || 'erreur'}` };
  }
}

// ============================================================================
// iLOVEPDF
// ============================================================================
// Docs: https://www.iloveapi.com/docs/api-reference
// Auth: JWT (HS256) self-signed with public_key + secret_key
//   payload: { public_key, iat, exp, nbf } where iat/exp/nbf are UTC seconds
//   expire = iat + 3600 (1h)
// To check quota: GET /v1/start/{tool}/eu-1 with the signed JWT
//   response contains remainingFiles

function signIlovepdfJwt(publicKey: string, secretKey: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    public_key: publicKey,
    iat: now,
    nbf: now,
    exp: now + 3600,
  };
  const base64Url = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  const signingInput = `${base64Url(header)}.${base64Url(payload)}`;
  const signature = createHmac('sha256', secretKey)
    .update(signingInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${signingInput}.${signature}`;
}

export async function checkIlovepdfUsage(
  publicKey: string,
  secretKey: string
): Promise<ProviderUsage> {
  if (!publicKey || !secretKey) {
    return { source: 'ilovepdf/start', error: 'iLoveAPI public ou secret key manquant' };
  }

  let token: string;
  try {
    token = signIlovepdfJwt(publicKey, secretKey);
  } catch (e: any) {
    return { source: 'ilovepdf/start', error: `JWT sign failed: ${e?.message}` };
  }

  try {
    // Use 'merge' (cheapest tool) to start a task and get remainingFiles
    const res = await fetch('https://api.ilovepdf.com/v1/start/merge/eu-1', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        source: 'ilovepdf/start',
        error: `iLoveAPI ${res.status}: ${errText.slice(0, 200)}`,
      };
    }
    const data: any = await res.json();
    const remaining = data.remainingFiles ?? data.remaining_files ?? 0;
    return {
      source: 'ilovepdf/start',
      // iLoveAPI doesn't return quota total directly, but we know the free
      // tier is 250/month. If admin set a custom quota in DB, use that.
      quota: {
        used: 0, // not directly returned
        total: 0, // filled by caller from DB
        remaining,
        percent: 0,
      },
    };
  } catch (e: any) {
    return { source: 'ilovepdf/start', error: `Network: ${e?.message || 'erreur'}` };
  }
}

// ============================================================================
// NEON
// ============================================================================
// Docs: https://neon.tech/docs/manage/api-keys
//       https://neon.tech/docs/guides/partner-consumption-metrics
// Auth: Authorization: Bearer <api_key>
//
// Endpoints used:
//   - GET /api/v2/projects                          → list projects
//   - GET /api/v2/projects/{id}/branches            → branches per project
//   - GET /api/v2/orgs                              → list orgs (for org_id)
//   - GET /api/v2/consumption_history/v2/projects?from&to&granularity&metrics&org_id
//                                                  → consumption metrics

const NEON_API = 'https://console.neon.tech/api/v2';

export async function checkNeonUsage(
  apiKey: string,
  projectId?: string
): Promise<ProviderUsage> {
  if (!apiKey) {
    return { source: 'neon/projects', error: 'No Neon API key configured' };
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  // Neon expects RFC 3339 date-time
  const from = periodStart.toISOString();
  const to = periodEnd.toISOString();

  // 1. List orgs (need org_id for the consumption query)
  let orgId: string | undefined;
  let email: string | undefined;
  let plan: string | undefined;
  try {
    const orgsRes = await fetch(`${NEON_API}/orgs`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (orgsRes.ok) {
      const orgsData: any = await orgsRes.json();
      if (orgsData.orgs && orgsData.orgs.length > 0) {
        orgId = orgsData.orgs[0].id;
        plan = orgsData.orgs[0].plan;
      }
    }
  } catch {
    // ignore
  }

  // 2. Get user info
  try {
    const userRes = await fetch(`${NEON_API}/users/me`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (userRes.ok) {
      const u: any = await userRes.json();
      email = u.user?.email || u.email;
    }
  } catch {
    // ignore
  }

  // 3. List projects
  let projects: any[] = [];
  try {
    const projectsRes = await fetch(`${NEON_API}/projects`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (projectsRes.ok) {
      const data: any = await projectsRes.json();
      projects = data.projects || [];
    }
  } catch {
    // ignore
  }

  // 4. List branches per project
  let activeBranchCount = 0;
  for (const proj of projects) {
    try {
      const branchesRes = await fetch(
        `${NEON_API}/projects/${proj.id}/branches`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (branchesRes.ok) {
        const data: any = await branchesRes.json();
        activeBranchCount += (data.branches || []).length;
      }
    } catch {
      // ignore
    }
  }

  // 5. Get consumption metrics (storage, compute, transfer)
  let storageBytes = 0;
  let computeSeconds = 0;
  let transferBytes = 0;
  if (orgId) {
    try {
      const metrics = ['compute_unit_seconds', 'root_branch_bytes_month', 'child_branch_bytes_month', 'public_network_transfer_bytes', 'private_network_transfer_bytes'];
      const url = `${NEON_API}/consumption_history/v2/projects?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&granularity=monthly&metrics=${metrics.join(',')}&org_id=${orgId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data: any = await res.json();
        // Sum across all projects
        if (Array.isArray(data.projects)) {
          for (const proj of data.projects) {
            for (const period of proj.periods || []) {
              for (const consumption of period.consumption || []) {
                for (const m of consumption.metrics || []) {
                  if (m.metric_name === 'compute_unit_seconds') computeSeconds += m.value || 0;
                  else if (m.metric_name === 'root_branch_bytes_month') storageBytes += m.value || 0;
                  else if (m.metric_name === 'child_branch_bytes_month') storageBytes += m.value || 0;
                  else if (m.metric_name === 'public_network_transfer_bytes') transferBytes += m.value || 0;
                  else if (m.metric_name === 'private_network_transfer_bytes') transferBytes += m.value || 0;
                }
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return {
    source: 'neon/projects+consumption',
    email,
    plan,
    storage: {
      usedMb: parseFloat((storageBytes / (1024 * 1024)).toFixed(1)),
      unit: 'MB',
    },
    compute: {
      usedHours: parseFloat((computeSeconds / 3600).toFixed(2)),
      unit: 'hours',
    },
    transfer: {
      usedGb: parseFloat((transferBytes / (1024 * 1024 * 1024)).toFixed(3)),
      unit: 'GB',
    },
    projects: { active: projects.length },
    branches: { active: activeBranchCount },
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10),
  };
}

// ============================================================================
// VERCEL (kept for compatibility)
// ============================================================================
// Uses /v1/billing/charges (FOCUS v1.3) and /v1/usage as fallback
// See external-services.vercel.ts for the full implementation
import { checkVercelUsage as _checkVercelUsage } from './external-services.vercel';
export { _checkVercelUsage as checkVercelUsage };
export type { VercelUsage } from './external-services.vercel';
