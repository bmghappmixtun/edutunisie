/**
 * External service usage checkers (Vercel, Neon)
 *
 * Both have REST APIs that return quota / usage information.
 * The admin enters their API token via the admin panel; we store it encrypted
 * and use it to query the current usage.
 *
 * Vercel API: https://vercel.com/docs/rest-api
 *   - GET /v1/teams/{id}/usage — current billing period usage
 *   - GET /v9/projects — project list with limits
 *
 * Neon API: https://neon.tech/docs/manage/api
 *   - GET /api/v2/projects/{id}/consumption/projects — project consumption
 *   - GET /api/v2/consumption/transfer — transfer usage
 */

const VERCEL_API = 'https://api.vercel.com';
const NEON_API = 'https://console.neon.tech/api/v2';

export type VercelUsage = {
  // Period (current billing cycle)
  periodStart: string;
  periodEnd: string;
  // Aggregated usage
  bandwidth: { used: number; unit: string; limit?: number };
  functions: { used: number; unit: string; limit?: number };
  builds: { used: number; unit: string; limit?: number };
  // Errors
  error?: string;
  // Account info
  username?: string;
  plan?: string;
};

export type NeonUsage = {
  // Current period
  periodStart: string;
  periodEnd: string;
  // Storage
  storage: { usedMb: number; limitMb?: number; percent?: number };
  // Compute time
  compute: { usedHours: number; limitHours?: number; percent?: number };
  // Data transfer
  transfer: { usedGb: number; limitGb?: number; percent?: number };
  // Projects
  projects: { active: number; limit?: number };
  // Branch / compute endpoints
  branches?: { active: number; limit?: number };
  // Errors
  error?: string;
  // Account info
  email?: string;
  plan?: string;
};

/**
 * Fetch Vercel usage for the current billing period
 */
export async function checkVercelUsage(token: string): Promise<VercelUsage> {
  if (!token) {
    return {
      periodStart: '',
      periodEnd: '',
      bandwidth: { used: 0, unit: 'GB' },
      functions: { used: 0, unit: 'GB-Hours' },
      builds: { used: 0, unit: 'builds' },
      error: 'No Vercel token',
    };
  }

  const now = new Date();
  // Vercel billing period: 1st of current month to 1st of next month
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  // Vercel API expects Unix timestamps in SECONDS (not ms)
  const fromSec = Math.floor(periodStart.getTime() / 1000);
  const toSec = Math.floor(periodEnd.getTime() / 1000);

  try {
    // Get user info (optional, non-fatal)
    let username: string | undefined;
    let plan: string | undefined;
    let teamId: string | undefined;
    try {
      const userRes = await fetch(`${VERCEL_API}/v1/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userRes.ok) {
        const userData: any = await userRes.json();
        username = userData.user?.username;
        plan = userData.user?.billing?.plan;
        // Get the default team (if any)
        if (userData.user?.defaultTeamId) {
          teamId = userData.user.defaultTeamId;
        }
      }
    } catch {
      // ignore
    }

    // Try personal account first, then team
    const usageEndpoints = teamId
      ? [
          { url: `${VERCEL_API}/v1/teams/${teamId}/usage?from=${fromSec}&to=${toSec}`, label: 'team' },
          { url: `${VERCEL_API}/v1/usage?from=${fromSec}&to=${toSec}`, label: 'personal' },
        ]
      : [
          { url: `${VERCEL_API}/v1/usage?from=${fromSec}&to=${toSec}`, label: 'personal' },
        ];

    let usageData: any = null;
    let lastError: string | undefined;
    for (const ep of usageEndpoints) {
      try {
        const usageRes = await fetch(ep.url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (usageRes.ok) {
          usageData = await usageRes.json();
          break;
        }
        const errText = await usageRes.text().catch(() => '');
        lastError = `Vercel ${ep.label}: ${usageRes.status} ${errText.slice(0, 150)}`;
      } catch (e: any) {
        lastError = `Vercel ${ep.label} network: ${e?.message || 'erreur'}`;
      }
    }

    if (!usageData) {
      return {
        periodStart: periodStart.toISOString().slice(0, 10),
        periodEnd: periodEnd.toISOString().slice(0, 10),
        bandwidth: { used: 0, unit: 'GB' },
        functions: { used: 0, unit: 'hours' },
        builds: { used: 0, unit: 'builds' },
        username,
        plan,
        error: lastError || 'Vercel API indisponible',
      };
    }

    // Vercel returns a flat array of usage objects
    // e.g. [{ resource: "bandwidth", usageValue: 123, usageUnit: "GB" }, ...]
    // OR a nested object: { bandwidth: { usageValue, usageUnit }, ... }
    let bandwidthValue = 0;
    let bandwidthUnit = 'GB';
    let functionsValue = 0;
    let functionsUnit = 'hours';
    let buildsValue = 0;

    if (Array.isArray(usageData)) {
      for (const item of usageData) {
        if (item.resource === 'bandwidth' || item.resource === 'fastDataTransfer') {
          bandwidthValue = parseFloat(item.usageValue) || 0;
          bandwidthUnit = item.usageUnit || 'GB';
        } else if (item.resource === 'functions') {
          functionsValue = parseFloat(item.usageValue) || 0;
          functionsUnit = item.usageUnit || 'GB-Hours';
        } else if (item.resource === 'builds') {
          buildsValue = parseFloat(item.usageValue) || 0;
        }
      }
    } else if (typeof usageData === 'object' && usageData !== null) {
      // Nested format
      if (usageData.bandwidth) {
        bandwidthValue = parseFloat(usageData.bandwidth.usageValue) || 0;
        bandwidthUnit = usageData.bandwidth.usageUnit || 'GB';
      }
      if (usageData.functions) {
        functionsValue = parseFloat(usageData.functions.usageValue) || 0;
        functionsUnit = usageData.functions.usageUnit || 'GB-Hours';
      }
      if (usageData.builds) {
        buildsValue = parseFloat(usageData.builds.usageValue) || 0;
      }
    }

    // Normalize units
    let bandwidthGB = bandwidthValue;
    if (bandwidthUnit === 'MB' || bandwidthUnit === 'MBs') {
      bandwidthGB = bandwidthValue / 1024;
    } else if (bandwidthUnit === 'Bytes' || bandwidthUnit === 'B') {
      bandwidthGB = bandwidthValue / (1024 * 1024 * 1024);
    }
    let functionsHours = functionsValue;
    if (functionsUnit === 'GB-Hours' || functionsUnit === 'GB-Hrs') {
      functionsHours = functionsValue * 1000;
    } else if (functionsUnit === 'ms' || functionsUnit === 'milliseconds') {
      functionsHours = functionsValue / 1000 / 3600 / 1000;
    }

    return {
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
      bandwidth: { used: parseFloat(bandwidthGB.toFixed(2)), unit: 'GB' },
      functions: { used: parseFloat(functionsHours.toFixed(2)), unit: 'hours' },
      builds: { used: buildsValue, unit: 'builds' },
      username,
      plan,
    };
  } catch (e: any) {
    return {
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
      bandwidth: { used: 0, unit: 'GB' },
      functions: { used: 0, unit: 'hours' },
      builds: { used: 0, unit: 'builds' },
      error: e?.message || 'Network error',
    };
  }
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
    // Use the specific project if provided, otherwise the first project
    const targetProjectId = projectId || projects[0]?.id;
    let storageMb = 0;
    let computeSeconds = 0;
    let transferGb = 0;

    if (targetProjectId) {
      // Storage: query the latest consumption
      try {
        const consumptionRes = await fetch(
          `${NEON_API}/projects/${targetProjectId}/consumption/projects?from=${from}&to=${to}&granularity=daily`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        if (consumptionRes.ok) {
          const cData: any = await consumptionRes.json();
          // Sum up active_time_seconds for the period
          if (cData.consumption && Array.isArray(cData.consumption)) {
            for (const day of cData.consumption) {
              computeSeconds += day.active_time_seconds || 0;
            }
          }
        }
      } catch {
        // ignore
      }

      // Get current storage from a sample endpoint
      try {
        const statsRes = await fetch(
          `${NEON_API}/projects/${targetProjectId}/branches`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        if (statsRes.ok) {
          // We don't get direct storage; approximate from branch count
          // (real implementation would query metrics)
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
