// Cloudflare Workers Prisma client (ISOLATED BRANCH - feature/cf-isolated)
//
// Uses @prisma/adapter-pg + Hyperdrive (Workers-compatible).
// This branch is FULLY INDEPENDENT of Vercel — no swap scripts,
// no next.config.js modifications. The CF build just works.
//
// Why we need this: Prisma 5.x's native binary engine doesn't work in CF
// Workers because it uses fs.readdir() to list engine files, which isn't
// implemented. The driver adapter pattern (@prisma/adapter-pg) avoids the
// native binary entirely — pg is pure JS and uses net.Socket which Workers
// support via nodejs_compat.
//
// Note: We do NOT use $use middleware here because it requires the binary
// engine. Teacher slugs are auto-filled in the application code via
// buildTeacherSlug() helper before user.create() calls.
//
// To work on this branch:
//   git checkout feature/cf-isolated
//   ./scripts/deploy-cf.sh        # builds + deploys, no Vercel involved
//
// To bring Vercel changes in:
//   git fetch origin
//   git merge origin/main         # or cherry-pick specific commits

import 'server-only';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const globalForPrisma = globalThis as unknown as {
  __prismaClient: PrismaClient | undefined;
  __prismaInitPromise: Promise<PrismaClient> | undefined;
};

async function createCFPrismaClient(): Promise<PrismaClient> {
  // Get the Hyperdrive binding from Cloudflare context
  // MUST be called inside a function, NOT at module level
  const { env } = await getCloudflareContext({ async: true });
  
  const connectionString = env.HYPERDRIVE?.connectionString;
  if (!connectionString) {
    throw new Error('HYPERDRIVE binding missing on Cloudflare Worker');
  }
  
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  // Note: no $use middleware - that would require the binary engine
  // which doesn't work on Workers
  return new PrismaClient({ adapter, log: ['error'] });
}

async function getPrisma(): Promise<PrismaClient> {
  if (globalForPrisma.__prismaClient) {
    return globalForPrisma.__prismaClient;
  }
  if (globalForPrisma.__prismaInitPromise) {
    return globalForPrisma.__prismaInitPromise;
  }
  globalForPrisma.__prismaInitPromise = createCFPrismaClient();
  const client = await globalForPrisma.__prismaInitPromise;
  globalForPrisma.__prismaClient = client;
  return client;
}

// Thenable proxy - the same API as PrismaClient but async
function makeModelProxy(modelName: string): any {
  let cached: any = undefined;
  let pending: Promise<any> | undefined = undefined;
  
  const getModel = async () => {
    if (cached) return cached;
    if (pending) return pending;
    pending = (async () => {
      const client = await getPrisma();
      cached = (client as any)[modelName];
      return cached;
    })();
    return pending;
  };
  
  return new Proxy({} as any, {
    get(_, prop) {
      if (prop === 'then') {
        return (resolve: any, reject: any) => getModel().then(resolve, reject);
      }
      if (typeof prop === 'symbol') return undefined;
      return (...args: any[]) => {
        return getModel().then(model => {
          const value = model[prop];
          if (typeof value === 'function') return value.apply(model, args);
          return value;
        });
      };
    }
  });
}

function makeDollarProxy(): any {
  return new Proxy({} as any, {
    get(_, prop) {
      if (prop === 'then') return undefined;
      if (typeof prop === 'symbol') return undefined;
      return (...args: any[]) => {
        return getPrisma().then(client => {
          const value = (client as any)[prop];
          if (typeof value === 'function') return value.apply(client, args);
          return value;
        });
      };
    }
  });
}

export const prisma = new Proxy({} as any, {
  get(_, prop) {
    if (typeof prop === 'symbol') return undefined;
    if (typeof prop === 'string' && prop.startsWith('$')) {
      return (makeDollarProxy() as any)[prop];
    }
    return makeModelProxy(prop as string);
  }
}) as unknown as PrismaClient;

export { getPrisma };
export type { PrismaClient } from '@prisma/client';
