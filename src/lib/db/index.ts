// Drizzle ORM client for Cloudflare Workers
// ISOLATED BRANCH: feature/cf-isolated
//
// Uses the `postgres` driver (postgres.js) with Hyperdrive connection.
// Works on Cloudflare Workers because postgres.js is pure JS (no native binary).
//
// IMPORTANT: This is ONLY used on the CF POC. Vercel uses Prisma directly.

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDrizzle = globalThis as unknown as {
  __drizzleClient: ReturnType<typeof drizzle> | undefined;
  __drizzleInitPromise: Promise<ReturnType<typeof drizzle>> | undefined;
};

async function createDrizzleClient() {
  // Get Hyperdrive binding from Cloudflare context
  // MUST be called inside a function, NOT at module level
  const { getCloudflareContext } = await import('@opennextjs/cloudflare');
  const { env } = await getCloudflareContext({ async: true });

  const connectionString = env.HYPERDRIVE?.connectionString;
  if (!connectionString) {
    throw new Error('HYPERDRIVE binding missing on Cloudflare Worker');
  }

  // postgres.js with Hyperdrive: max=1 connection, idle_timeout disabled
  // for Workers (which can freeze the isolate)
  const client = postgres(connectionString, {
    max: 1,
    idle_timeout: 0,    // Workers can freeze any time
    connect_timeout: 10,
    prepare: false,      // Workers don't support named prepared statements
  });

  return drizzle(client, { schema });
}

export async function getDb() {
  if (globalForDrizzle.__drizzleClient) {
    return globalForDrizzle.__drizzleClient;
  }
  if (globalForDrizzle.__drizzleInitPromise) {
    return globalForDrizzle.__drizzleInitPromise;
  }
  globalForDrizzle.__drizzleInitPromise = createDrizzleClient();
  const db = await globalForDrizzle.__drizzleInitPromise;
  globalForDrizzle.__drizzleClient = db;
  return db;
}

export { schema };
