import { PrismaClient } from '@prisma/client';
const p = new PrismaClient({
  datasources: { db: { url: 'postgresql://neondb_owner:npg_HBF0Tw4UIvWi@ep-round-art-asyh88wq-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require' } }
});
const ar = await p.resource.findMany({
  where: {
    subject: { slug: 'arabe' },
    title: { contains: 'ables' }
  },
  include: { metadata: true }
});
console.log('Fables issue:');
for (const r of ar) {
  console.log(`  #${r.id}:`);
  console.log(`    title: ${r.title}`);
  console.log(`    generalSubject: ${r.metadata?.generalSubject || 'null'}`);
}
await p.$disconnect();
