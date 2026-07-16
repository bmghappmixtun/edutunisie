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
      const fillSlug = (data: any) => {
        if (!data || data.slug) return;
        data.slug = buildTeacherSlug(
          data.firstName ?? null,
          data.lastName ?? null,
          data.email
        );
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
