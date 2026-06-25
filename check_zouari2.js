const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const dbMatch = env.match(/DATABASE_URL="?([^"\n]+)"?/);
if (dbMatch) process.env.DATABASE_URL = dbMatch[1];

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const zouaris = await p.user.findMany({ where: { firstName: 'Sami', lastName: 'Zouari' } });
  console.log('Zouari accounts:', zouaris.length);
  for (const z of zouaris) {
    const r = await p.resource.findFirst({ where: { teacherId: z.id }, select: { fileUrl: true, title: true } });
    console.log(`  ${z.email}: ${r ? r.title : 'no resources'} | ${r?.fileUrl}`);
  }
  await p.$disconnect();
})();
