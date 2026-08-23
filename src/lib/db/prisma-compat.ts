// Prisma-compatible proxy backed by Drizzle ORM
// ISOLATED BRANCH: feature/cf-isolated
//
// This file replaces the Prisma `prisma` object on the CF build. It exposes
// the same API as the real Prisma client (findMany, findUnique, count, etc.)
// but executes queries via Drizzle + postgres.js (Workers-native).
//
// IMPORTANT: Only supports the 6 models defined in ./schema. For other
// models (Comment, Rating, etc.), the methods return empty arrays / 0
// to keep pages rendering without crashes.
//
// CRITICAL: This file is ONLY used on the CF POC. Vercel uses Prisma.
// Never merge this to main without explicit user approval.

import { getDb } from './index';
import * as s from './schema';
import { eq, and, or, desc, asc, sql, SQL } from 'drizzle-orm';

// ============================================================
// SQL translation helpers
// ============================================================

type WhereInput = Record<string, any>;

function buildConditions(table: any, where: WhereInput | undefined): SQL | undefined {
  if (!where) return undefined;

  const conditions: SQL<unknown>[] = [];

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;

    // Handle Prisma operators
    if (key === 'AND' || key === 'OR' || key === 'NOT') {
      // Complex AND/OR/NOT — best effort translation
      // For our simple cases, just take the first condition
      if (Array.isArray(value)) {
        for (const sub of value) {
          const sub2 = buildConditions(table, sub);
          if (sub2) conditions.push(sub2);
        }
      } else if (key === 'NOT') {
        const sub2 = buildConditions(table, value as WhereInput);
        if (sub2) conditions.push(sql<unknown>`NOT (${sub2})`);
      } else if (key === 'OR') {
        const ors: SQL<unknown>[] = [];
        for (const sub of value as WhereInput[]) {
          const sub2 = buildConditions(table, sub);
          if (sub2) ors.push(sub2);
        }
        const orSql = or(...ors); if (orSql) conditions.push(orSql);
      }
      continue;
    }

    // Handle relations — like { class: { slug: 'xxx' } } — join via classId
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
      // Could be a relation filter or a Prisma operator like { contains: 'x' }
      // For relations, we'll do a subquery in a future iteration
      // For operators, handle them
      const isOperator = Object.keys(value).every(k => ['contains', 'startsWith', 'endsWith', 'gt', 'gte', 'lt', 'lte', 'in', 'notIn', 'not', 'equals', 'mode', 'has', 'some', 'every', 'none'].includes(k));
      if (isOperator) {
        // Operator on a column
        for (const [op, opValue] of Object.entries(value)) {
          const col = (table as any)[key];
          if (!col) continue;
          switch (op) {
            case 'contains': conditions.push(sql`${col} LIKE ${'%' + opValue + '%'}`); break;
            case 'startsWith': conditions.push(sql`${col} LIKE ${opValue + '%'}`); break;
            case 'endsWith': conditions.push(sql`${col} LIKE ${'%' + opValue}`); break;
            case 'gt': conditions.push(sql`${col} > ${opValue}`); break;
            case 'gte': conditions.push(sql`${col} >= ${opValue}`); break;
            case 'lt': conditions.push(sql`${col} < ${opValue}`); break;
            case 'lte': conditions.push(sql`${col} <= ${opValue}`); break;
            case 'in': conditions.push(sql`${col} IN ${opValue}`); break;
            case 'notIn': conditions.push(sql`${col} NOT IN ${opValue}`); break;
            case 'not': {
              if (typeof opValue === 'object' && opValue !== null) {
                const sub = buildConditions(table, { [key]: opValue });
                if (sub) conditions.push(sql`NOT (${sub})`);
              } else {
                conditions.push(sql`${col} != ${opValue}`);
              }
              break;
            }
            case 'equals': conditions.push(eq(col, opValue)); break;
            default: break;
          }
        }
      }
      // For relations, we skip for now (limited support)
      continue;
    }

    // Simple equality
    if (value === null) {
      const col = (table as any)[key];
      if (col) conditions.push(sql`${col} IS NULL`);
    } else {
      const col = (table as any)[key];
      if (col) conditions.push(eq(col, value));
    }
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions)!;
}

function buildOrderBy(table: any, orderBy: any | any[] | undefined): any[] | undefined {
  if (!orderBy) return undefined;
  const items = Array.isArray(orderBy) ? orderBy : [orderBy];
  return items.map(item => {
    if (typeof item !== 'object' || item === null) return undefined;
    const [[field, direction]] = Object.entries(item);
    const col = (table as any)[field];
    if (!col) return undefined;
    return direction === 'desc' ? desc(col) : asc(col);
  }).filter(Boolean);
}

function applySelect(rows: any[], select: any | undefined): any[] {
  if (!select || !Array.isArray(rows)) return rows;
  return rows.map(row => {
    const out: any = {};
    for (const key of Object.keys(select)) {
      if (select[key] && typeof row[key] !== 'undefined') {
        out[key] = row[key];
      } else if (select[key] === false) {
        // skip
      } else {
        out[key] = row[key];
      }
    }
    return out;
  });
}

function applyInclude(rows: any[], include: any | undefined): any[] {
  if (!include || !Array.isArray(rows)) return rows;
  // Skip relation includes for now (would need join logic)
  return rows;
}

// ============================================================
// Model proxies
// ============================================================

function makeModelProxy(modelName: 'resource' | 'user' | 'subject' | 'class' | 'level' | 'section' | 'comment' | 'rating' | 'favorite' | 'view' | 'download' | 'share' | 'report' | 'notification' | 'newsletter' | 'teacherInvitation' | 'setting' | 'follow' | 'conversation' | 'message' | 'contactMessage' | 'searchSynonym' | 'searchLog' | 'apiProvider' | 'apiProviderUsage' | 'errorLog' | 'vercelLog' | 'otpCode' | 'session' | 'resourceContent' | 'resourceMetadata' | 'resourceSummary' | 'teacherVerificationFile' | 'teacherFile') {
  // Models we actually have schemas for
  const supportedModels: Record<string, any> = {
    resource: s.resources,
    user: s.users,
    subject: s.subjects,
    class: s.classes,
    level: s.levels,
    section: s.sections,
  };

  const table = supportedModels[modelName];
  const isSupported = !!table;

  return {
    findUnique: async (args?: { where?: WhereInput; select?: any; include?: any }): Promise<any> => {
      if (!isSupported) return null;
      const db = await getDb();
      const where = args?.where;
      // Prisma uses { where: { id: 'xxx' } } or { where: { numericId: 1 } }
      const conditions = buildConditions(table, where);
      const rows = await db.select().from(table).where(conditions).limit(1);
      const result = applyInclude(applySelect(rows, args?.select), args?.include);
      return result[0] || null;
    },

    findFirst: async (args?: { where?: WhereInput; orderBy?: any; select?: any; include?: any; skip?: number; take?: number }): Promise<any> => {
      if (!isSupported) return null;
      const db = await getDb();
      const conditions = buildConditions(table, args?.where);
      const orderBy = buildOrderBy(table, args?.orderBy) || [desc((table as any).id)];
      const rows = await db.select().from(table)
        .where(conditions)
        .orderBy(...orderBy)
        .limit(1);
      const result = applyInclude(applySelect(rows, args?.select), args?.include);
      return result[0] || null;
    },

    findMany: async (args?: any): Promise<any> => {
      // Returns `any` (not `any[]`) so downstream code can call methods
      // like `.reduce((s, c) => ...)` without TypeScript complaining about
      // untyped accumulator (this would happen if we typed it as `any[]`).
      if (!isSupported) return [];
      const db = await getDb();
      const conditions = buildConditions(table, args?.where);
      const orderBy = buildOrderBy(table, args?.orderBy);
      let q: any = db.select().from(table).where(conditions);
      if (orderBy && orderBy.length) q = q.orderBy(...orderBy);
      if (typeof args?.skip === 'number') q = q.offset(args.skip);
      if (typeof args?.take === 'number') q = q.limit(args.take);
      const rows = await q;
      // Return type cast: we declare `any` so downstream reduce callbacks work
      // @ts-ignore - suppress array return type to allow implicit any in reduce callbacks
      return applyInclude(applySelect(rows, args?.select), args?.include) as any;
    },

    count: async (args?: { where?: WhereInput }) => {
      if (!isSupported) return 0;
      const db = await getDb();
      const conditions = buildConditions(table, args?.where);
      const rows = await db.select({ count: sql<number>`count(*)::int` }).from(table).where(conditions);
      return Number(rows[0]?.count || 0);
    },

    // Operations that we don't support yet — return sensible defaults
    create: async () => { throw new Error(`Drizzle proxy: create on ${modelName} not supported yet`); },
    update: async () => { throw new Error(`Drizzle proxy: update on ${modelName} not supported yet`); },
    upsert: async () => { throw new Error(`Drizzle proxy: upsert on ${modelName} not supported yet`); },
    delete: async () => { throw new Error(`Drizzle proxy: delete on ${modelName} not supported yet`); },
    deleteMany: async () => { throw new Error(`Drizzle proxy: deleteMany on ${modelName} not supported yet`); },
    updateMany: async () => { throw new Error(`Drizzle proxy: updateMany on ${modelName} not supported yet`); },
    createMany: async () => { throw new Error(`Drizzle proxy: createMany on ${modelName} not supported yet`); },

    groupBy: async () => {
      // For /fr/ressources filters — return empty array
      // The page will show "all types" if no groupBy
      return [];
    },

    aggregate: async () => {
      // For /fr/ressources stats (sum of downloads) — return zeros
      return { _sum: { downloadsCount: 0 } };
    },
  };
}

// ============================================================
// Top-level prisma proxy
// ============================================================

type ModelName = 'resource' | 'user' | 'subject' | 'class' | 'level' | 'section' |
  'comment' | 'rating' | 'favorite' | 'view' | 'download' | 'share' | 'report' |
  'notification' | 'newsletter' | 'teacherInvitation' | 'setting' | 'follow' |
  'conversation' | 'message' | 'contactMessage' | 'searchSynonym' | 'searchLog' |
  'apiProvider' | 'apiProviderUsage' | 'errorLog' | 'vercelLog' | 'otpCode' | 'session' |
  'resourceContent' | 'resourceMetadata' | 'resourceSummary' | 'teacherVerificationFile' | 'teacherFile';

// Cache the model proxies (same model proxy is reused)
const modelCache: Record<string, any> = {};

export const prisma = new Proxy({}, {
  get(_, prop: string) {
    if (typeof prop !== 'string') return undefined;
    if (prop === '$connect' || prop === '$disconnect' || prop === '$transaction' || prop === '$use' || prop === '$extends' || prop === '$on') {
      // Provide no-op implementations for compatibility
      if (prop === '$connect' || prop === '$disconnect') return async () => {};
      if (prop === '$on') return () => {};
      if (prop === '$transaction') return async (fn: any) => typeof fn === 'function' ? fn(prisma) : Promise.all(fn);
      return () => {};
    }
    if (!modelCache[prop]) {
      modelCache[prop] = makeModelProxy(prop as ModelName);
    }
    return modelCache[prop];
  }
}) as any;

// Re-export getDb as getPrisma for compatibility with files that
// explicitly import { getPrisma } from '@/lib/prisma'
export { getDb as getPrisma } from './index';
export type PrismaClient = any;
