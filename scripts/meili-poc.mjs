import { Meilisearch } from 'meilisearch';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const meili = new Meilisearch({ host: 'http://127.0.0.1:7700', apiKey: 'poc-test-key-12345' });

console.log('1. Creating index...');
await meili.createIndex('resources', { primaryKey: 'id' }).catch(() => {});
const idx = meili.index('resources');
await new Promise(r => setTimeout(r, 2000));

console.log('2. Configure settings...');
await idx.updateSettings({
  searchableAttributes: ['title', 'description', 'teacherName', 'subjectName', 'className', 'sectionName'],
  filterableAttributes: ['type', 'subject', 'class', 'section', 'trimestre', 'year', 'language', 'hasCorrection'],
  sortableAttributes: ['publishedAt', 'viewsCount', 'downloadsCount'],
  rankingRules: ['words', 'typo', 'proximity', 'attribute', 'exactness', 'viewsCount:desc'],
  synonyms: {
    math: ['mathematiques', 'mathématique', 'رياضيات'],
    svt: ['sciences de la vie et de la terre', 'علوم الحياة والأرض', 'sciences naturelles'],
    phys: ['physique', 'sciences physiques', 'فيزياء'],
    bac: ['baccalaureat', 'الباكالوريا'],
    '1as': ['1ere secondaire', 'première année secondaire'],
    fr: ['francais', 'الفرنسية'],
    ar: ['arabe', 'العربية'],
    en: ['anglais', 'الإنجليزية'],
    devoir: ['devoirs', 'tâche', 'travail'],
    corrige: ['correction', 'corrigés', 'solution'],
  },
  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: { oneTypo: 4, twoTypos: 7 },
  },
});
await new Promise(r => setTimeout(r, 1000));

console.log('3. Fetching 1000 resources from Prisma...');
const resources = await prisma.resource.findMany({
  where: { status: 'PUBLISHED' },
  take: 1000,
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
  description: (r.description || '').slice(0, 500),
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
  publishedAt: r.publishedAt?.toISOString() || r.createdAt?.toISOString(),
}));

console.log(`4. Indexing ${docs.length} documents...`);
const task = await idx.addDocuments(docs);
console.log('  Task:', task.taskUid);

for (let i = 0; i < 15; i++) {
  const t = await meili.tasks.getTask(task.taskUid);
  if (t.status === 'succeeded') { console.log('  ✓ Indexed in', i, 's'); break; }
  if (t.status === 'failed') { console.log('  ✗ Failed:', JSON.stringify(t.error)); break; }
  await new Promise(r => setTimeout(r, 1000));
}

await prisma.$disconnect();
console.log('\n✓ POC ready with', docs.length, 'documents');
