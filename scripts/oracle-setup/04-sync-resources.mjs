/**
 * 04-sync-resources.mjs
 * Run ON the Oracle Cloud instance to sync Examanet resources to Meilisearch
 *
 * Usage:
 *   1. Copy this file + .env.local to /root/meili-sync/
 *   2. cd /root/meili-sync
 *   3. cp /workspace/edutunisie/package.json .   (or install meilisearch + @prisma/client + dotenv)
 *   4. node 04-sync-resources.mjs
 *
 * This will:
 *   - Configure the resources index with searchable/filterable/synonyms
 *   - Pull all 15,333 resources from Neon Postgres
 *   - Push to Meilisearch in batches of 1000
 *   - Verify the final count
 */

import { Meilisearch } from 'meilisearch';
import { PrismaClient } from '@prisma/client';

const MEILI_URL = process.env.MEILI_URL || 'http://127.0.0.1:7700';
const MEILI_KEY = process.env.MEILI_MASTER_KEY || require('fs').readFileSync('/root/.meili-master-key', 'utf8').trim();
const BATCH_SIZE = 1000;

console.log('========================================');
console.log(' Examanet → Meilisearch Sync');
console.log('========================================\n');

const prisma = new PrismaClient();
const meili = new Meilisearch({ host: MEILI_URL, apiKey: MEILI_KEY });

async function main() {
  // Step 1: Create or reset index
  console.log('1. Creating/resetting index...');
  try {
    const task = await meili.createIndex('resources', { primaryKey: 'id' });
    await meili.waitForTask(task.taskUid);
    console.log('  ✓ Index created');
  } catch (e) {
    if (e.cause?.code === 'index_already_exists') {
      console.log('  ✓ Index already exists, will reconfigure');
    } else {
      throw e;
    }
  }
  const idx = meili.index('resources');

  // Step 2: Configure settings
  console.log('2. Configuring index settings...');
  const settingsTask = await idx.updateSettings({
    searchableAttributes: [
      'title',
      'description',
      'teacherName',
      'subjectName',
      'className',
      'sectionName',
    ],
    filterableAttributes: [
      'type',
      'subject',
      'class',
      'section',
      'trimestre',
      'year',
      'language',
      'hasCorrection',
      'teacherId',
    ],
    sortableAttributes: ['publishedAt', 'viewsCount', 'downloadsCount'],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'exactness',
      'viewsCount:desc',
      'downloadsCount:desc',
      'publishedAt:desc',
    ],
    synonyms: {
      // Math
      math: ['mathematiques', 'mathématique', 'رياضيات'],
      // Physics
      phys: ['physique', 'sciences physiques', 'فيزياء'],
      // SVT
      svt: ['sciences de la vie et de la terre', 'علوم الحياة والأرض', 'sciences naturelles'],
      // Arabic synonyms
      'الفرنسية': ['francais', 'français', 'fr'],
      'العربية': ['arabe', 'ar'],
      'الإنجليزية': ['anglais', 'english', 'en'],
      // Tunisian education system
      bac: ['baccalaureat', 'baccalauréat', 'الباكالوريا'],
      '1as': ['1ere année secondaire', '1ère année secondaire', 'première année'],
      '2as': ['2eme année secondaire', '2ème année secondaire', 'deuxième année'],
      '3as': ['3eme année secondaire', '3ème année secondaire', 'troisième année'],
      '4as': ['4eme année secondaire', '4ème année secondaire', 'quatrième année'],
      '7eme': ['7ème année', 'septième année de base'],
      '8eme': ['8ème année', 'huitième année de base'],
      '9eme': ['9ème année', 'neuvième année de base'],
      // Resource types
      devoir: ['devoirs', 'tâche', 'travail', 'homework'],
      corrige: ['correction', 'corrigés', 'corrigée', 'solution'],
      exercice: ['exercices', 'série', 'TD'],
      resume: ['résumé', 'résumés', 'synthèse'],
      examen: ['examens', 'épreuve', 'bac blanc'],
      // Languages
      fr: ['francais', 'français', 'الفرنسية'],
      ar: ['arabe', 'العربية'],
      en: ['anglais', 'english', 'الإنجليزية'],
    },
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: { oneTypo: 4, twoTypos: 7 },
      disableOnAttributes: [],
      disableOnWords: [],
    },
    faceting: { maxValuesPerFacet: 200 },
    pagination: { maxTotalHits: 5000 },
  });
  await meili.waitForTask(settingsTask.taskUid);
  console.log('  ✓ Settings configured');

  // Step 3: Count total resources
  console.log('3. Counting resources...');
  const total = await prisma.resource.count({ where: { status: 'PUBLISHED' } });
  console.log(`  Total resources in DB: ${total.toLocaleString()}`);

  // Step 4: Sync in batches
  console.log('\n4. Syncing resources in batches...');
  let offset = 0;
  let processed = 0;
  const startTime = Date.now();

  while (offset < total) {
    const resources = await prisma.resource.findMany({
      where: { status: 'PUBLISHED' },
      skip: offset,
      take: BATCH_SIZE,
      orderBy: { id: 'asc' },
      include: {
        subject: { select: { nameFr: true, slug: true } },
        class: { select: { nameFr: true, slug: true } },
        section: { select: { nameFr: true, slug: true } },
        teacher: { select: { firstName: true, lastName: true } },
      },
    });

    const docs = resources.map(r => ({
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
    }));

    const task = await idx.addDocuments(docs);
    await meili.waitForTask(task.taskUid);
    processed += docs.length;
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = Math.round(processed / elapsed);
    console.log(`  ✓ ${processed.toLocaleString()}/${total.toLocaleString()} (${rate} docs/s)`);
    offset += BATCH_SIZE;
  }

  // Step 5: Final verification
  console.log('\n5. Final verification...');
  await new Promise(r => setTimeout(r, 2000)); // wait for indexing to settle
  const stats = await idx.getStats();
  console.log('  Index stats:');
  console.log('  - numberOfDocuments:', stats.numberOfDocuments);
  console.log('  - isIndexing:', stats.isIndexing);
  console.log('  - fieldDistribution:', JSON.stringify(stats.fieldDistribution).slice(0, 200));

  // Quick test query
  const test = await idx.search('devoir', { limit: 3 });
  console.log(`  - Test query "devoir" → ${test.estimatedTotalHits} results`);

  await prisma.$disconnect();
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Sync complete in ${totalTime}s!`);
  console.log(`\nYour Meilisearch is ready:`);
  console.log(`  Local:  http://127.0.0.1:7700`);
  console.log(`  Public: https://${process.env.MEILI_PUBLIC_URL || 'search.examanet.com'}`);
  console.log(`  Master key: ${MEILI_KEY.slice(0, 8)}...${MEILI_KEY.slice(-8)}`);
}

main().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});