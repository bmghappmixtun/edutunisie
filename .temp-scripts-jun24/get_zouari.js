const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const dbMatch = env.match(/DATABASE_URL="?([^"\n]+)"?/);
if (dbMatch) process.env.DATABASE_URL = dbMatch[1];

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const zouari = await p.user.findFirst({ where: { firstName: 'Sami', lastName: 'Zouari', email: { contains: 'import.zouari' } } });
  if (!zouari) {
    console.log('NO_ZOUARI');
    process.exit(1);
  }
  const r = await p.resource.findMany({
    where: { teacherId: zouari.id, importedFrom: 'tunisiecollege.net' },
    select: { id: true, title: true, fileUrl: true, fileKey: true, fileSize: true }
  });
  console.log(JSON.stringify(r, null, 2));
  await p.$disconnect();
})();
