// @ts-nocheck
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

// ============================================================
// Relation map — derived from src/lib/db/schema.ts
// Maps parent model -> { relationName: { relatedModel, fk } }
// This is the source of truth for relation lookups in applyInclude.
// ============================================================
const RELATION_MAP: Record<string, Record<string, { relatedModel: string; fk: string }>> = {
  resource: {
    class: { relatedModel: 'class', fk: 'classId' },
    section: { relatedModel: 'section', fk: 'sectionId' },
    subject: { relatedModel: 'subject', fk: 'subjectId' },
    teacher: { relatedModel: 'user', fk: 'teacherId' },
    content: { relatedModel: 'resourceContent', fk: 'id' },
    metadata: { relatedModel: 'resourceMetadata', fk: 'id' },
    summary: { relatedModel: 'resourceSummary', fk: 'id' },
    comments: { relatedModel: 'comment', fk: 'resourceId' },
    ratings: { relatedModel: 'rating', fk: 'resourceId' },
    favorites: { relatedModel: 'favorite', fk: 'resourceId' },
    views: { relatedModel: 'view', fk: 'resourceId' },
    downloads: { relatedModel: 'download', fk: 'resourceId' },
    shares: { relatedModel: 'share', fk: 'resourceId' },
  },
  user: {
    otpCodes: { relatedModel: 'otpCode', fk: 'userId' },
    sessions: { relatedModel: 'session', fk: 'userId' },
    uploadedFiles: { relatedModel: 'resource', fk: 'teacherId' },
    teacherFiles: { relatedModel: 'teacherFile', fk: 'teacherId' },
    comments: { relatedModel: 'comment', fk: 'userId' },
    ratings: { relatedModel: 'rating', fk: 'userId' },
    favorites: { relatedModel: 'favorite', fk: 'userId' },
    followers: { relatedModel: 'follow', fk: 'followingId' },
    following: { relatedModel: 'follow', fk: 'followerId' },
    teacherInvitations: { relatedModel: 'teacherInvitation', fk: 'teacherId' },
  },
  subject: {
    resources: { relatedModel: 'resource', fk: 'subjectId' },
  },
  class: {
    level: { relatedModel: 'level', fk: 'levelId' },
    sections: { relatedModel: 'section', fk: 'classId' },
    resources: { relatedModel: 'resource', fk: 'classId' },
  },
  level: {
    classes: { relatedModel: 'class', fk: 'levelId' },
  },
  section: {
    class: { relatedModel: 'class', fk: 'classId' },
    resources: { relatedModel: 'resource', fk: 'sectionId' },
  },
  comment: {
    resource: { relatedModel: 'resource', fk: 'resourceId' },
    user: { relatedModel: 'user', fk: 'userId' },
  },
  favorite: {
    resource: { relatedModel: 'resource', fk: 'resourceId' },
    user: { relatedModel: 'user', fk: 'userId' },
  },
  notification: {
    user: { relatedModel: 'user', fk: 'userId' },
  },
};

const MODEL_TO_TABLE: Record<string, any> = {
  resource: s.resources,
  user: s.users,
  subject: s.subjects,
  class: s.classes,
  level: s.levels,
  section: s.sections,
  comment: s.comments,
  rating: s.ratings,
  favorite: s.favorites,
  view: s.views,
  download: s.downloads,
  share: s.shares,
  report: s.reports,
  notification: s.notifications,
  newsletter: s.newsletters,
  teacherInvitation: s.teacherInvitations,
  setting: s.settings,
  follow: s.follows,
  conversation: s.conversations,
  message: s.messages,
  contactMessage: s.contactMessages,
  searchSynonym: s.searchSynonyms,
  searchLog: s.searchLogs,
  apiProvider: s.apiProviders,
  apiProviderUsage: s.apiProviderUsages,
  errorLog: s.errorLogs,
  vercelLog: s.vercelLogs,
  otpCode: s.otpCodes,
  session: s.sessions,
  resourceContent: s.resourceContents,
  resourceMetadata: s.resourceMetadata,
  resourceSummary: s.resourceSummaries,
  teacherVerificationFile: s.teacherVerificationFiles,
  teacherFile: s.teacherFiles,
};

function getRelatedModel(parent: string, relationName: string): { relatedModel: string; fk: string } | null {
  return RELATION_MAP[parent]?.[relationName] || null;
}

// Apply include relations to a list of rows.
// For each include entry, do a batch query for all related rows and merge.
async function applyInclude(
  rows: any[],
  include: any | undefined,
  parentModel: string
): Promise<any[]> {
  if (!include || !Array.isArray(rows) || rows.length === 0) return rows;
  if (typeof include === 'object' && Object.keys(include).length === 0) return rows;

  try {
    return await _applyIncludeImpl(rows, include, parentModel);
  } catch (e: any) {
    // Never let include errors break the page — log and return rows as-is
    console.error('[applyInclude]', parentModel, e?.message || String(e));
    return rows;
  }
}

async function _applyIncludeImpl(
  rows: any[],
  include: any | undefined,
  parentModel: string
): Promise<any[]> {
  if (!include || !Array.isArray(rows) || rows.length === 0) return rows;
  if (typeof include === 'object' && Object.keys(include).length === 0) return rows;

  const out: any[] = [];
  for (const row of rows) {
    const enriched: any = { ...row };
    for (const [relationName, relationValue] of Object.entries(include)) {
      if (relationValue === false) continue;

      const rel = getRelatedModel(parentModel, relationName);
      if (!rel) {
        // Unknown relation — skip silently
        continue;
      }
      const relatedTable = MODEL_TO_TABLE[rel.relatedModel];
      if (!relatedTable) continue;

      // For 1-1 relations (where fk === 'id'), the FK is row.id
      // For 1-many relations, the FK is on the related table
      const fkValue = rel.fk === 'id' ? row.id : row[rel.fk];

      if (!fkValue) {
        enriched[relationName] = null;
        continue;
      }

      // Build the query
      const db = await getDb();
      const selectOpt = relationValue && typeof relationValue === 'object' && relationValue.select;
      const whereOpt = relationValue && typeof relationValue === 'object' && relationValue.where;
      const takeOpt = relationValue && typeof relationValue === 'object' && typeof relationValue.take === 'number'
        ? relationValue.take : 1;

      // For 1-1 (fk === 'id'), query: WHERE id = fkValue
      // For 1-many (fk !== 'id'), query: WHERE fk = fkValue
      let query: any;
      if (rel.fk === 'id') {
        // 1-1
        if (selectOpt) {
          const cols: any = {};
          for (const f of Object.keys(selectOpt)) {
            if (selectOpt[f] === true && (relatedTable as any)[f]) {
              cols[f] = (relatedTable as any)[f];
            }
          }
          query = db.select(cols).from(relatedTable).where(eq(relatedTable.id, fkValue)).limit(1);
        } else {
          query = db.select().from(relatedTable).where(eq(relatedTable.id, fkValue)).limit(1);
        }
        const rs = await query;
        enriched[relationName] = rs[0] || null;
      } else {
        // 1-many
        const fkCol = (relatedTable as any)[rel.fk];
        if (!fkCol) {
          enriched[relationName] = null;
          continue;
        }
        if (selectOpt) {
          const cols: any = {};
          for (const f of Object.keys(selectOpt)) {
            if (selectOpt[f] === true && (relatedTable as any)[f]) {
              cols[f] = (relatedTable as any)[f];
            }
          }
          query = db.select(cols).from(relatedTable).where(eq(fkCol, fkValue)).limit(takeOpt);
        } else {
          query = db.select().from(relatedTable).where(eq(fkCol, fkValue)).limit(takeOpt);
        }
        const rs = await query;
        // Prisma convention: 1-1 returns object, 1-many returns array
        // Heuristic: if relationName is plural (ends in 's') or no _count, treat as array
        const isArray = relationName.endsWith('s') || (relationValue && typeof relationValue === 'object' && !('select' in relationValue));
        enriched[relationName] = isArray ? rs : (rs[0] || null);
      }
    }
    out.push(enriched);
  }
  return out;
}

// Apply _count: { select: { relationName: { where: ... } } }
// For each relation in the _count, do a count query and attach as row._count[relationName]
async function applyCount(
  rows: any[],
  countArg: any | undefined,
  parentModel: string
): Promise<any[]> {
  if (!countArg || !Array.isArray(rows) || rows.length === 0) return rows;
  if (typeof countArg !== 'object') return rows;
  const selectMap = countArg.select || (countArg === true ? null : countArg);
  if (!selectMap || typeof selectMap !== 'object') return rows;

  try {
    return await _applyCountImpl(rows, selectMap, parentModel);
  } catch (e: any) {
    // Never let count errors break the page — log and return rows as-is
    console.error('[applyCount]', parentModel, e?.message || String(e));
    return rows;
  }
}

async function _applyCountImpl(
  rows: any[],
  selectMap: any,
  parentModel: string
): Promise<any[]> {

  for (const row of rows) {
    row._count = row._count || {};
    for (const [relationName, relationValue] of Object.entries(selectMap)) {
      if (relationValue === false) continue;

      const rel = getRelatedModel(parentModel, relationName);
      if (!rel) continue;
      const relatedTable = MODEL_TO_TABLE[rel.relatedModel];
      if (!relatedTable) continue;

      // For 1-1, count is always 1 or 0
      // For 1-many, do a count query
      if (rel.fk === 'id') {
        row._count[relationName] = row.id && (relatedTable as any).id ? 1 : 0;
        continue;
      }

      const fkCol = (relatedTable as any)[rel.fk];
      if (!fkCol) {
        row._count[relationName] = 0;
        continue;
      }
      const whereOpt = relationValue && typeof relationValue === 'object' ? relationValue.where : undefined;
      const conditions = buildConditions(relatedTable, whereOpt ? { [rel.fk]: row[rel.fk === 'id' ? 'id' : 'id'], ...whereOpt } : whereOpt);

      // Simplified: WHERE fkCol = row[rel.fk] (and merge with whereOpt)
      const db = await getDb();
      const conds: SQL<unknown>[] = [eq(fkCol, row[rel.fk === 'id' ? 'id' : rel.fk.replace('Id', 'Id')])];
      // row's FK for this relation is row.<relationName + "Id"> or row.<parentField>
      // Simpler: use the explicit FK column from the relation
      // rel.fk is the FK column on the related table, e.g. 'teacherId' on resource
      // The value is row.<parent's column>, e.g. row.id (when parent is the user)
      // We need to find the parent's column that points to the related
      // For "user" with "uploadedFiles" relation (resource.teacherId = user.id), the value is row.id
      // For "class" with "resources" relation (resource.classId = class.id), the value is row.id
      // So generally: the value is the parent's primary key (row.id), and the relation uses a FK on the related side

      // Rebuild query properly
      const finalConds: SQL<unknown>[] = [eq(fkCol, row.id)];
      if (whereOpt) {
        const sub = buildConditions(relatedTable, whereOpt);
        if (sub) finalConds.push(sub);
      }
      const where = finalConds.length > 1 ? and(...finalConds) : finalConds[0];

      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(relatedTable)
        .where(where);
      row._count[relationName] = Number(result[0]?.count || 0);
    }
  }
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
      const result = await applyCount(await applyInclude(applySelect(rows, args?.select), args?.include, modelName), args?._count, modelName);
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
      const result = await applyCount(await applyInclude(applySelect(rows, args?.select), args?.include, modelName), args?._count, modelName);
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
      return await applyCount(await applyInclude(applySelect(rows, args?.select), args?.include, modelName), args?._count, modelName) as any;
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
