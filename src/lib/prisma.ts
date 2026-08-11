import 'server-only';
import { PrismaClient } from '@prisma/client';
import { buildTeacherSlug } from './teacher-url';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  __teacherSlugHookInstalled?: boolean;
};

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

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
 * 4. For Server Components: call prisma directly. No need for /api routes.
 * 
 * 5. For mutations: use Server Actions + Zod validation.
 */
