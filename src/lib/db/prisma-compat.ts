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

  // Check for no-match marker (set by preprocessWhereForRelations when a
  // nested relation filter resolved to zero matches)
  if (where.__no_match__) {
    // Return a condition that matches nothing: 1=0
    return sql<unknown>`1 = 0`;
  }

  const conditions: SQL<unknown>[] = [];

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;
    if (key === '__no_match__') continue;

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

// Phase 3 (2026-08-24): nested relation filter support
// Pre-process the where clause to resolve nested relation filters like
//   { class: { slug: { in: ['xxx'] } } }
// into FK-based IN filters:
//   { classId: { in: ['id1', 'id2', ...] } }
//
// This unblocks pages that use nested relations in WHERE:
//   - /fr/professeurs: filters teachers by subjects/classes they teach
//   - /fr/ressources: facetBase uses class/section/subject slug filters
//   - Many other pages with `where: { x: { y: { ... } } }` patterns
//
// The function:
//   1. Walks the where clause looking for relation keys (top-level keys
//      that are NOT simple column names AND NOT Prisma operators)
//   2. For each relation, runs a subquery on the related table to get
//      the matching IDs
//   3. Replaces the relation with `{ fkColumn: { in: [ids] } }`
//   4. If the subquery returns 0 rows, sets __no_match__ marker so
//      buildConditions returns "1 = 0" (impossible)
async function preprocessWhereForRelations(
  where: WhereInput | undefined,
  parentModel: string
): Promise<WhereInput | undefined> {
  if (!where || typeof where !== 'object') return where;

  const out: WhereInput = {};

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;
    if (key === '__no_match__') continue;

    // Pass through AND/OR/NOT (recursive)
    if (key === 'AND') {
      if (Array.isArray(value)) {
        out[key] = await Promise.all(
          (value as WhereInput[]).map((sub) => preprocessWhereForRelations(sub, parentModel))
        );
      } else {
        out[key] = value;
      }
      continue;
    }
    if (key === 'OR') {
      if (Array.isArray(value)) {
        out[key] = await Promise.all(
          (value as WhereInput[]).map((sub) => preprocessWhereForRelations(sub, parentModel))
        );
      } else {
        out[key] = value;
      }
      continue;
    }
    if (key === 'NOT') {
      out[key] = await preprocessWhereForRelations(value as WhereInput, parentModel);
      continue;
    }

    // Check if value is an object (could be operator or relation filter)
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      // Is it an operator? (contains, gt, etc. — no nested keys)
      const isOperator = Object.keys(value).every((k) =>
        [
          'contains',
          'startsWith',
          'endsWith',
          'gt',
          'gte',
          'lt',
          'lte',
          'in',
          'notIn',
          'not',
          'equals',
          'mode',
          'has',
          'some',
          'every',
          'none',
        ].includes(k)
      );

      if (isOperator) {
        out[key] = value; // Pass through to existing buildConditions
        continue;
      }

      // It looks like a nested relation filter: { class: { slug: { in: [...] } } }
      const rel = getRelatedModel(parentModel, key);
      if (!rel) {
        out[key] = value; // Unknown relation, pass through
        continue;
      }

      const relatedTable = MODEL_TO_TABLE[rel.relatedModel];
      if (!relatedTable) {
        out[key] = value; // Unknown table, pass through
        continue;
      }

      try {
        // Build subquery: SELECT id FROM relatedTable WHERE <inner filter>
        const subConditions = buildConditions(relatedTable, value);
        const db = await getDb();
        const idCol = (relatedTable as any).id;
        if (!idCol) {
          out[key] = value;
          continue;
        }
        const subResult = await db
          .select({ id: idCol })
          .from(relatedTable)
          .where(subConditions)
          .limit(500);

        const ids = subResult.map((r: any) => r.id).filter(Boolean);

        if (ids.length === 0) {
          // No matches — impossible condition
          out.__no_match__ = true;
          return out; // Short-circuit
        }

        // Replace with FK-based IN filter
        out[rel.fk] = { in: ids };
      } catch (e: any) {
        // On error, fall back to skipping (preserves old behavior)
        console.warn(
          '[preprocessWhereForRelations]',
          parentModel,
          key,
          e?.message || String(e)
        );
        // Don't add anything — let the rest of the query proceed
      }
      continue;
    }

    // Simple value
    out[key] = value;
  }

  return out;
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
      // For 1-many relations:
      //   - BACKWARD (FK on related, e.g. user.uploadedFiles -> resource.teacherId):
      //     use row.id (parent's PK)
      //   - FORWARD (FK on parent, e.g. resource.subject -> subject.id):
      //     use row[rel.fk] (parent's FK column)
      //   Detect direction by checking if FK column exists on related table.
      const _rt = MODEL_TO_TABLE[rel.relatedModel];
      const _fkOnRelated = _rt ? (_rt as any)[rel.fk] : null;
      const fkValue = rel.fk === 'id' ? row.id : (_fkOnRelated ? row.id : row[rel.fk]);

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
        // 1-many relation. The relation can be:
        //   FORWARD: parent's FK points to child (e.g. resource.subjectId -> subject.id)
        //            query: WHERE related.id = parent.fk
        //   BACKWARD: child's FK points to parent (e.g. resource.teacherId -> user.id)
        //            query: WHERE related.fk = parent.id
        //
        // Detect direction by checking if the FK column exists on the related table.
        // If yes: BACKWARD. If no: FORWARD (FK must be on the parent).
        const fkOnRelated = (relatedTable as any)[rel.fk];
        let whereClause: SQL;
        if (fkOnRelated) {
          // BACKWARD: child has FK pointing to parent
          whereClause = eq(fkOnRelated, fkValue);
        } else {
          // FORWARD: parent has FK pointing to child (use child's PK)
          if (!(relatedTable as any).id) {
            enriched[relationName] = null;
            continue;
          }
          whereClause = eq(relatedTable.id, fkValue);
        }
        if (selectOpt) {
          const cols: any = {};
          for (const f of Object.keys(selectOpt)) {
            if (selectOpt[f] === true && (relatedTable as any)[f]) {
              cols[f] = (relatedTable as any)[f];
            }
          }
          query = db.select(cols).from(relatedTable).where(whereClause).limit(takeOpt);
        } else {
          query = db.select().from(relatedTable).where(whereClause).limit(takeOpt);
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

      // Detect direction:
      //   - BACKWARD (FK on related, e.g. user.uploadedFiles): child has FK to parent
      //     fkCol = relatedTable.fk, WHERE fkCol = row.id
      //   - FORWARD (FK on parent, e.g. resource.subjects): parent has FK to child
      //     For counting parents, we'd group by parent.fk and count
      //     But this is rare - usually applyCount is used for 1-many backward relations
      //     For now, if FK is on parent, just return 0 (parent either has 0 or 1 child of this type)
      const fkCol = (relatedTable as any)[rel.fk];
      if (!fkCol) {
        // FORWARD direction: parent has FK to child. Count of children is 0 or 1.
        // Skip for now — applyInclude handles the actual data.
        row._count[relationName] = row[rel.fk] ? 1 : 0;
        continue;
      }
      const whereOpt = relationValue && typeof relationValue === 'object' ? relationValue.where : undefined;
      const conditions = buildConditions(relatedTable, whereOpt ? { [rel.fk]: row.id, ...whereOpt } : whereOpt);

      // BACKWARD: WHERE relatedTable.fk = row.id (parent's PK)
      const db = await getDb();
      const conds: SQL<unknown>[] = [eq(fkCol, row.id)];
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
      const where = await preprocessWhereForRelations(args?.where, modelName);
      // Prisma uses { where: { id: 'xxx' } } or { where: { numericId: 1 } }
      const conditions = buildConditions(table, where);
      const rows = await db.select().from(table).where(conditions).limit(1);
      const result = await applyCount(await applyInclude(applySelect(rows, args?.select), args?.include, modelName), args?._count, modelName);
      return result[0] || null;
    },

    findFirst: async (args?: { where?: WhereInput; orderBy?: any; select?: any; include?: any; skip?: number; take?: number }): Promise<any> => {
      if (!isSupported) return null;
      const db = await getDb();
      const where = await preprocessWhereForRelations(args?.where, modelName);
      const conditions = buildConditions(table, where);
      const orderBy = buildOrderBy(table, args?.orderBy) || [desc((table as any).id)];
      const rows = await db.select().from(table)
        .where(conditions)
        .orderBy(...orderBy)
        .limit(1);
      const result = await applyCount(await applyInclude(applySelect(rows, args?.select), args?.include, modelName), args?._count, modelName);
      return result[0] || null;
    },

    findMany: async (args?: any): Promise<any> => {
      console.log('[findMany]', modelName, 'include=', Object.keys(args?.include || {}), 'hasWhere=', !!args?.where);
      // Returns `any` (not `any[]`) so downstream code can call methods
      // like `.reduce((s, c) => ...)` without TypeScript complaining about
      // untyped accumulator (this would happen if we typed it as `any[]`).
      if (!isSupported) return [];
      const db = await getDb();
      const where = await preprocessWhereForRelations(args?.where, modelName);
      const conditions = buildConditions(table, where);
      const orderBy = buildOrderBy(table, args?.orderBy);
      let q: any = db.select().from(table).where(conditions);
      if (orderBy && orderBy.length) q = q.orderBy(...orderBy);
      // Safety cap to prevent runaway queries on Workers
      const MAX_ROWS = 500;
      if (typeof args?.take === 'number') q = q.limit(Math.min(args.take, MAX_ROWS));
      if (typeof args?.skip === 'number') q = q.offset(args.skip);
      const rows = await q;
      // Return type cast: we declare `any` so downstream reduce callbacks work
      // @ts-ignore - suppress array return type to allow implicit any in reduce callbacks
      const result = await applyCount(await applyInclude(applySelect(rows, args?.select), args?.include, modelName), args?._count, modelName) as any;
      try {
        const allKeys = Array.isArray(result) && result[0] ? Object.keys(result[0]) : [];
        console.log('[findMany end]', modelName, 'len=', Array.isArray(result) ? result.length : 0, 'allKeys=', JSON.stringify(allKeys), 'sample=', Array.isArray(result) && result[0] ? JSON.stringify(result[0]).slice(0, 500) : 'none');
      } catch (e) {}
      return result as any;
    },

    count: async (args?: { where?: WhereInput }) => {
      if (!isSupported) return 0;
      const db = await getDb();
      const where = await preprocessWhereForRelations(args?.where, modelName);
      const conditions = buildConditions(table, where);
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

    groupBy: async (args?: { by?: string[]; where?: WhereInput; _count?: any; _avg?: any; _sum?: any; _min?: any; _max?: any; orderBy?: any; take?: number; skip?: number }): Promise<any[]> => {
      if (!isSupported || !args?.by?.length) return [];
      try {
        const db = await getDb();
        const where = await preprocessWhereForRelations(args?.where, modelName);
        const conditions = buildConditions(table, where);
        // Build select object
        const selectObj: Record<string, any> = {};
        const aliasMap: Record<string, string> = {};  // alias -> real column name
        for (const col of args.by) {
          if ((table as any)[col]) {
            selectObj[col] = (table as any)[col];
          }
        }
        // Aggregations
        const aggs: Record<string, string> = {};
        if (args._count) {
          if (args._count._all) {
            selectObj['_count_all'] = sql<number>`count(*)::int`;
            aggs['_count_all'] = '_count';
          }
          for (const [k, v] of Object.entries(args._count)) {
            if (k === '_all') continue;
            if (v && (table as any)[k]) {
              selectObj[`_count_${k}`] = sql<number>`count(${(table as any)[k]})::int`;
              aggs[`_count_${k}`] = '_count';
            }
          }
        }
        if (args._avg) {
          for (const [k, v] of Object.entries(args._avg)) {
            if (v && (table as any)[k]) {
              selectObj[`_avg_${k}`] = sql<string>`avg(${(table as any)[k]})::float`;
              aggs[`_avg_${k}`] = '_avg';
            }
          }
        }
        if (args._sum) {
          for (const [k, v] of Object.entries(args._sum)) {
            if (v && (table as any)[k]) {
              selectObj[`_sum_${k}`] = sql<number>`sum(${(table as any)[k]})::int`;
              aggs[`_sum_${k}`] = '_sum';
            }
          }
        }
        if (args._min) {
          for (const [k, v] of Object.entries(args._min)) {
            if (v && (table as any)[k]) {
              selectObj[`_min_${k}`] = sql<any>`min(${(table as any)[k]})`;
              aggs[`_min_${k}`] = '_min';
            }
          }
        }
        if (args._max) {
          for (const [k, v] of Object.entries(args._max)) {
            if (v && (table as any)[k]) {
              selectObj[`_max_${k}`] = sql<any>`max(${(table as any)[k]})`;
              aggs[`_max_${k}`] = '_max';
            }
          }
        }
        // Build query
        let q: any = db.select(selectObj).from(table).where(conditions);
        // Group by
        const groupCols = args.by.filter(c => (table as any)[c]).map(c => (table as any)[c]);
        if (groupCols.length) q = q.groupBy(...groupCols);
        // Order by
        const orderBy = buildOrderBy(table, args?.orderBy);
        if (orderBy && orderBy.length) q = q.orderBy(...orderBy);
        // Skip/Take (with safety cap to prevent runaway queries)
        // Always apply a max limit even if no take specified
        const maxRows = 500;
        const take = typeof args?.take === 'number' ? Math.min(args.take, maxRows) : maxRows;
        q = q.limit(take);
        if (typeof args?.skip === 'number') q = q.offset(args.skip);
        const rows = await q;
        // Transform: { col1, _count_all: N } => { col1, _count: { _all: N } }
        return rows.map((row: any) => {
          const result: any = {};
          // Copy group by columns
          for (const col of args.by!) {
            if (col in row) result[col] = row[col];
          }
          // Re-nest aggregations
          for (const [alias, type] of Object.entries(aggs)) {
            const realCol = alias.replace(new RegExp(`^${type}_`), '');
            if (!result[type]) result[type] = {};
            if (realCol === 'all' && type === '_count') {
              result[type]._all = Number(row[alias] || 0);
            } else {
              const v = row[alias];
              result[type][realCol] = type === '_avg' ? (v === null ? null : Number(v)) : (type === '_count' || type === '_sum' ? Number(v || 0) : v);
            }
          }
          return result;
        });
      } catch (e) {
        console.error('[groupBy]', modelName, e?.message || String(e));
        return [];
      }
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
