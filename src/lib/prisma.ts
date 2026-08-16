import 'server-only';
import { PrismaClient } from '@prisma/client';
import { buildTeacherSlug } from './teacher-url';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  __teacherSlugHookInstalled?: boolean;
};

function createPrismaClient() {
  // Connection pool config:
  // - Neon free tier supports up to ~10 connections
  // - Default Prisma client uses connection_limit=5 in serverless
  // - We set explicit limit=10 + longer pool_timeout to absorb spikes
  // - For long-running functions we can still hit the limit, but
  //   most page renders use 2-4 connections concurrently
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Connection pool config:
  // - Neon pooler uses PgBouncer in transaction mode
  // - We set ?pgbouncer=true to tell Prisma to use transaction mode
  //   (disables prepared statements, uses simple query protocol)
  // - connection_limit=5 per Lambda (Vercel can spawn multiple concurrent
  //   instances; 5 covers ~5 in-flight queries per Lambda).
  //   Bumped from 2 → 5 on 2026-08-16 to fix "Timed out fetching a new
  //   connection" errors that were doubling function invocations via retries
  //   and inflating the Observability Events line item ($31.01 on the
  //   Aug-2026 Vercel bill).
  // - pool_timeout=20s: wait longer for a connection before failing
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    if (!url.searchParams.has('pgbouncer')) {
      url.searchParams.set('pgbouncer', 'true');
    }
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '5');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '20');
    }
    process.env.DATABASE_URL = url.toString();
  }

  // Auto-fill User.slug on create if not provided
  client.$use(async (params, next) => {
    if (params.model === 'User' && (params.action === 'create' || params.action === 'createMany')) {
      const fillSlug = (data: { slug?: string; firstName?: string | null; lastName?: string | null; email?: string }) => {
        if (!data || data.slug) return;
        data.slug = buildTeacherSlug(data.firstName ?? null, data.lastName ?? null, data.email);
      };
      if (params.action === 'createMany' && Array.isArray(params.args?.data)) {
        for (const d of params.args.data) fillSlug(d);
      } else if (params.args?.data) {
        fillSlug(params.args.data);
      }
    }
    return next(params);
  });

  return client;
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * SECURITY & BEST PRACTICES:
 * 
 * 1. Singleton pattern: PrismaClient is cached on globalThis to prevent
 *    connection proliferation during dev hot-reload.
 * 
 * 2. server-only: import 'server-only' at the top ensures this file cannot
 *    be imported from a Client Component. Build will fail if attempted.
 * 
 * 3. NO $disconnect() per request: Neon pooling handles connection lifecycle.
 * 
 * 4. connection_limit=10: tuned for Neon free tier + spike absorption.
 *    Previous limit was 5, which caused P2034 (Timed out fetching connection)
 *    errors under load.
 * 
 * 5. pool_timeout=20: gives connections more time to be released before
 *    failing, smoothing out bursty traffic.
 * 
 * 6. For Server Components: call prisma directly. No need for /api routes.
 * 
 * 7. For mutations: use Server Actions + Zod validation.
 */
