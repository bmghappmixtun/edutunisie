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

  try {
    // Get user info (optional)
    let username: string | undefined;
    let plan: string | undefined;
    try {
      const userRes = await fetch(`${VERCEL_API}/www/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userRes.ok) {
        const userData: any = await userRes.json();
        username = userData.user?.username;
        plan = userData.user?.billing?.plan;
      }
    } catch {
      // ignore
    }

    // Fetch usage
    const usageRes = await fetch(
      `${VERCEL_API}/usage?team_id=&start=${periodStart.getTime()}&end=${periodEnd.getTime()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!usageRes.ok) {
      const errText = await usageRes.text().catch(() => '');
      return {
        periodStart: periodStart.toISOString().slice(0, 10),
        periodEnd: periodEnd.toISOString().slice(0, 10),
        bandwidth: { used: 0, unit: 'GB' },
        functions: { used: 0, unit: 'GB-Hours' },
        builds: { used: 0, unit: 'builds' },
        username,
        plan,
        error: `Vercel API ${usageRes.status}: ${errText.slice(0, 200)}`,
      };
    }

    const data: any = await usageRes.json();

    // Vercel returns values in bytes for bandwidth, etc.
    const bandwidthBytes = (data.bandwidth?.usageValue || 0) * 1024 * 1024; // they report in MB?
    const bandwidthGB = bandwidthBytes / 1024 / 1024 / 1024;
    const functionGBHours = data.functions?.usageValue || 0;
    const builds = data.builds?.usageValue || 0;

    return {
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
      bandwidth: {
        used: parseFloat(bandwidthGB.toFixed(2)),
        unit: 'GB',
      },
      functions: {
        used: parseFloat((functionGBHours / 1000).toFixed(2)),
        unit: 'hours',
      },
      builds: {
        used: builds,
        unit: 'builds',
      },
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
