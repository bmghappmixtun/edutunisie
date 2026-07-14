/**
 * External service usage checkers (Vercel, Neon)
 *
 * Vercel API: https://vercel.com/docs/rest-api
 *   - GET /v1/billing/charges — NEW billing/charges endpoint (FOCUS v1.3)
 *     Returns JSONL, from/to as ISO 8601 date-time UTC
 *     https://vercel.com/docs/rest-api/billing/list-focus-billing-charges
 *   - GET /v1/usage — legacy endpoint, returns aggregate usage
 *
 * Neon API: https://neon.tech/docs/manage/api
 */

const VERCEL_API = 'https://api.vercel.com';
const NEON_API = 'https://console.neon.tech/api/v2';

export type VercelUsage = {
  periodStart: string;
  periodEnd: string;
  bandwidth: { used: number; unit: string; limit?: number };
  functions: { used: number; unit: string; limit?: number };
  builds: { used: number; unit: string; limit?: number };
  error?: string;
  username?: string;
  plan?: string;
  source?: 'billing-charges' | 'usage-v1' | 'none';
};

export type NeonUsage = {
  periodStart: string;
  periodEnd: string;
  storage: { usedMb: number; limitMb?: number; percent?: number };
  compute: { usedHours: number; limitHours?: number; percent?: number };
  transfer: { usedGb: number; limitGb?: number; percent?: number };
  projects: { active: number; limit?: number };
  branches?: { active: number; limit?: number };
  error?: string;
  email?: string;
  plan?: string;
};

/**
 * Fetch Vercel usage for the current billing period.
 *
 * Tries in order:
 *   1. /v1/billing/charges (newer, FOCUS format, JSONL)
 *   2. /v1/usage (legacy, JSON object)
 *   3. Falls back to "no data" if both fail
 */
export async function checkVercelUsage(token: string): Promise<VercelUsage> {
  const empty = (overrides: Partial<VercelUsage> = {}): VercelUsage => ({
    periodStart: '',
    periodEnd: '',
    bandwidth: { used: 0, unit: 'GB' },
    functions: { used: 0, unit: 'hours' },
    builds: { used: 0, unit: 'builds' },
    source: 'none',
    ...overrides,
  });

  if (!token) return empty({ error: 'No Vercel token' });

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  // Vercel API expects ISO 8601 date-time in UTC
  const fromISO = periodStart.toISOString(); // e.g. "2026-07-01T00:00:00.000Z"
  const toISO = periodEnd.toISOString();

  // Get user info (non-fatal)
  let username: string | undefined;
  let plan: string | undefined;
  let teamId: string | undefined;
  try {
    const userRes = await fetch(`${VERCEL_API}/v2/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (userRes.ok) {
      const userData: any = await userRes.json();
      username = userData.user?.username;
      plan = userData.user?.plan;
      teamId = userData.user?.defaultTeamId;
    }
  } catch {
    // ignore
  }

  // ============================================================
  // STRATEGY 1: /v1/billing/charges (new, FOCUS v1.3 JSONL)
  // ============================================================
  const teamParam = teamId ? `&teamId=${teamId}` : '';
  const billingUrl = `${VERCEL_API}/v1/billing/charges?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}${teamParam}`;
  try {
    const res = await fetch(billingUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const text = await res.text();
      const lines = text.split('\n').filter(Boolean);
      let bandwidth = 0;
      let bandwidthUnit = 'GB';
      let functionsGbSec = 0;
      let builds = 0;
      let foundAny = false;

      for (const line of lines) {
        try {
          const charge = JSON.parse(line);
          if (charge.ChargeCategory !== 'Usage') continue;
          foundAny = true;
          const service = (charge.ServiceName || '').toLowerCase();
          const qty = charge.ConsumedQuantity || 0;
          const unit = charge.ConsumedUnit || '';

          if (
            service.includes('bandwidth') ||
            service.includes('fast data transfer') ||
            service.includes('data transfer')
          ) {
            bandwidth += qty;
            bandwidthUnit = unit;
          } else if (
            service.includes('function') ||
            service.includes('compute') ||
            service.includes('execution') ||
            service.includes('invocation')
          ) {
            functionsGbSec += qty;
          } else if (service.includes('build')) {
            builds += qty;
          }
        } catch {
          // ignore parse errors
        }
      }

      if (foundAny) {
        return {
          periodStart: periodStart.toISOString().slice(0, 10),
          periodEnd: periodEnd.toISOString().slice(0, 10),
          bandwidth: normalizeBandwidth(bandwidth, bandwidthUnit),
          functions: normalizeFunctions(functionsGbSec),
          builds: { used: Math.round(builds), unit: 'builds' },
          username,
          plan,
          source: 'billing-charges',
        };
      }
    } else if (res.status !== 404 && res.status !== 403) {
      // 404/403 means user doesn't have access to this endpoint (e.g., Hobby plan)
      // Other errors are real failures
      const errText = await res.text().catch(() => '');
      console.warn('[vercel-usage] billing/charges error:', res.status, errText.slice(0, 200));
    }
  } catch (e: any) {
    console.warn('[vercel-usage] billing/charges network error:', e?.message);
  }

  // ============================================================
  // STRATEGY 2: /v1/usage (legacy, JSON object)
  // ============================================================
  const usageUrl = teamId
    ? `${VERCEL_API}/v1/teams/${teamId}/usage?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`
    : `${VERCEL_API}/v1/usage?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`;
  try {
    const res = await fetch(usageUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data: any = await res.json();
      const usage = parseLegacyUsage(data);
      if (usage) {
        return {
          periodStart: periodStart.toISOString().slice(0, 10),
          periodEnd: periodEnd.toISOString().slice(0, 10),
          ...usage,
          username,
          plan,
          source: 'usage-v1',
        };
      }
    } else {
      const errText = await res.text().catch(() => '');
      return empty({
        error: `Vercel ${res.status}: ${errText.slice(0, 250)}`,
        username,
        plan,
      });
    }
  } catch (e: any) {
    return empty({ error: `Network: ${e?.message || 'erreur'}`, username, plan });
  }

  return empty({ username, plan });
}

/**
 * Parse the legacy /v1/usage response (different shapes possible)
 */
function parseLegacyUsage(data: any): { bandwidth: any; functions: any; builds: any } | null {
  // Shape 1: flat array [{resource, usageValue, usageUnit}]
  if (Array.isArray(data)) {
    let bw = 0, bwUnit = 'GB', fn = 0, fnUnit = 'hours', builds = 0;
    let found = false;
    for (const item of data) {
      found = true;
      const v = parseFloat(item.usageValue) || 0;
      const u = item.usageUnit || '';
      if (item.resource === 'bandwidth' || item.resource === 'fastDataTransfer') {
        bw += v; bwUnit = u;
      } else if (item.resource === 'serverlessFunctionExecution' || item.resource === 'functions') {
        fn += v; fnUnit = u;
      } else if (item.resource === 'builds') {
        builds += v;
      }
    }
    if (!found) return null;
    return {
      bandwidth: normalizeBandwidth(bw, bwUnit),
      functions: normalizeFunctions(fn, fnUnit),
      builds: { used: Math.round(builds), unit: 'builds' },
    };
  }

  // Shape 2: nested object {bandwidth: {usageValue, usageUnit}, ...}
  if (typeof data === 'object' && data !== null) {
    return {
      bandwidth: normalizeBandwidth(
        parseFloat(data.bandwidth?.usageValue) || 0,
        data.bandwidth?.usageUnit || 'GB'
      ),
      functions: normalizeFunctions(
        parseFloat(data.serverlessFunctionExecution?.usageValue || data.functions?.usageValue) || 0,
        data.serverlessFunctionExecution?.usageUnit || data.functions?.usageUnit || 'hours'
      ),
      builds: {
        used: Math.round(parseFloat(data.builds?.usageValue) || 0),
        unit: 'builds',
      },
    };
  }

  return null;
}

function normalizeBandwidth(value: number, unit: string): { used: number; unit: string } {
  const u = (unit || '').toUpperCase();
  let gb = value;
  let normalizedUnit = 'GB';
  if (u === 'MB' || u === 'MBS') {
    gb = value / 1024;
  } else if (u === 'BYTES' || u === 'B') {
    gb = value / (1024 * 1024 * 1024);
  } else if (u === 'GB' || u === 'GBS') {
    gb = value;
    normalizedUnit = 'GB';
  } else if (u === 'TB' || u === 'TBS') {
    gb = value * 1024;
    normalizedUnit = 'GB';
  } else {
    normalizedUnit = unit || 'GB';
  }
  return { used: parseFloat(gb.toFixed(3)), unit: normalizedUnit };
}

function normalizeFunctions(value: number, unit?: string): { used: number; unit: string } {
  const u = (unit || '').toLowerCase();
  // Functions can be in GB-seconds, GB-hours, ms, etc.
  let hours = value;
  let finalUnit = 'hours';
  if (u === 'gb-seconds' || u === 'gb-s' || u === 'gb-secs') {
    hours = value / 3600;
  } else if (u === 'gb-hours' || u === 'gb-h' || u === 'gb-hrs') {
    hours = value;
  } else if (u === 'ms' || u === 'milliseconds') {
    hours = value / 1000 / 3600;
  } else if (u === 'seconds' || u === 's') {
    hours = value / 3600;
  } else {
    finalUnit = unit || 'GB-hours';
  }
  return { used: parseFloat(hours.toFixed(2)), unit: finalUnit };
}

/**
 * Fetch Neon usage for the current billing period
 */
export async function checkNeonUsage(apiKey: string, projectId?: string): Promise<NeonUsage> {
  if (!apiKey) {
    return {
      periodStart: '',
      periodEnd: '',
      storage: { usedMb: 0 },
      compute: { usedHours: 0 },
      transfer: { usedGb: 0 },
      projects: { active: 0 },
      error: 'No Neon API key',
    };
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const from = periodStart.toISOString();
  const to = periodEnd.toISOString();

  try {
    // 1. Get account info / projects
    let email: string | undefined;
    let plan: string | undefined;
    let projects: any[] = [];
    let activeProjectCount = 0;
    let activeBranchCount = 0;

    try {
      const projectsRes = await fetch(`${NEON_API}/projects`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (projectsRes.ok) {
        const data: any = await projectsRes.json();
        projects = data.projects || [];
        activeProjectCount = projects.length;
        for (const proj of projects) {
          try {
            const branchesRes = await fetch(
              `${NEON_API}/projects/${proj.id}/branches`,
              { headers: { Authorization: `Bearer ${apiKey}` } }
            );
            if (branchesRes.ok) {
              const branchesData: any = await branchesRes.json();
              activeBranchCount += (branchesData.branches || []).filter(
                (b: any) => b.primary === false
              ).length;
            }
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }

    // 2. Get consumption (storage, compute, transfer)
    const targetProjectId = projectId || projects[0]?.id;
    let storageMb = 0;
    let computeSeconds = 0;
    let transferGb = 0;

    if (targetProjectId) {
      try {
        const consumptionRes = await fetch(
          `${NEON_API}/projects/${targetProjectId}/consumption/projects?from=${from}&to=${to}&granularity=daily`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        if (consumptionRes.ok) {
          const cData: any = await consumptionRes.json();
          if (cData.consumption && Array.isArray(cData.consumption)) {
            for (const day of cData.consumption) {
              computeSeconds += day.active_time_seconds || 0;
            }
          }
        }
      } catch {
        // ignore
      }
    }

    return {
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
      storage: { usedMb: parseFloat(storageMb.toFixed(0)) },
      compute: { usedHours: parseFloat((computeSeconds / 3600).toFixed(1)) },
      transfer: { usedGb: parseFloat(transferGb.toFixed(2)) },
      projects: { active: activeProjectCount },
      branches: { active: activeBranchCount },
      email,
      plan,
      error: activeProjectCount === 0 ? 'Aucun projet trouvé ou clé API invalide' : undefined,
    };
  } catch (e: any) {
    return {
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
      storage: { usedMb: 0 },
      compute: { usedHours: 0 },
      transfer: { usedGb: 0 },
      projects: { active: 0 },
      error: e?.message || 'Network error',
    };
  }
}
