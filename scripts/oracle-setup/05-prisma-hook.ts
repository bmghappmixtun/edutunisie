/**
 * 05-prisma-hook.ts
 * Live sync hook: Prisma → Meilisearch
 *
 * Add this to your Next.js app to keep Meilisearch in sync with Postgres
 * in real-time when resources are created/updated/deleted.
 *
 * Place in: src/lib/meili-sync.ts
 *
 * Usage in your API routes or server actions:
 *
 *   import { syncResource } from '@/lib/meili-sync';
 *
 *   // After creating
 *   const resource = await prisma.resource.create({ ... });
 *   await syncResource('create', resource);
 *
 *   // After updating
 *   const updated = await prisma.resource.update({ ... });
 *   await syncResource('update', updated);
 *
 *   // After deleting
 *   await prisma.resource.delete({ where: { id } });
 *   await syncResource('delete', { id });
 */

import { Meilisearch } from 'meilisearch';
import type { Resource } from '@prisma/client';

const MEILI_URL = process.env.MEILI_URL || 'http://127.0.0.1:7700';
const MEILI_KEY = process.env.MEILI_MASTER_KEY || '';
const meili = new Meilisearch({ host: MEILI_URL, apiKey: MEILI_KEY });
const index = meili.index('resources');

/**
 * Push a resource to Meilisearch
 */
export async function syncResource(
  action: 'create' | 'update' | 'delete',
  resource: Partial<Resource> & { id: string }
) {
  try {
    if (action === 'delete') {
      await index.deleteDocument(resource.id);
      return;
    }

    // For create/update, transform to Meilisearch doc
    const fullResource = await fetchResourceWithRelations(resource.id);
    if (!fullResource) return;

    const doc = transformToMeiliDoc(fullResource);
    await index.addDocuments([doc]);
  } catch (e) {
    console.error(`[meili-sync] ${action} ${resource.id}:`, e);
    throw e;
  }
}

async function fetchResourceWithRelations(id: string) {
  const { prisma } = await import('./prisma');
  return prisma.resource.findUnique({
    where: { id },
    include: {
      subject: { select: { nameFr: true, slug: true } },
      class: { select: { nameFr: true, slug: true } },
      section: { select: { nameFr: true, slug: true } },
      teacher: { select: { firstName: true, lastName: true } },
    },
  });
}

function transformToMeiliDoc(r: any) {
  return {
    id: r.id,
    title: r.title,
    description: (r.description || '').slice(0, 1000),
    type: r.type,
    subject: r.subject?.slug,
    subjectName: r.subject?.nameFr,
    class: r.class?.slug,
    className: r.class?.nameFr,
    section: r.section?.slug,
    sectionName: r.section?.nameFr,
    trimestre: r.trimester,
    year: r.year,
    language: r.language,
    hasCorrection: r.hasCorrection,
    teacherId: r.teacherId,
    teacherName: [r.teacher?.firstName, r.teacher?.lastName].filter(Boolean).join(' ') || 'Inconnu',
    viewsCount: r.viewsCount || 0,
    downloadsCount: r.downloadsCount || 0,
    publishedAt: (r.publishedAt || r.createdAt)?.toISOString(),
  };
}

/**
 * Bulk sync: useful for re-syncing everything
 */
export async function bulkSync(resources: any[]) {
  const docs = resources.map(transformToMeiliDoc);
  return index.addDocuments(docs);
}