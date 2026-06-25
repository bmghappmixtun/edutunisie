const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const dbMatch = env.match(/DATABASE_URL="?([^"\n]+)"?/);
if (dbMatch) process.env.DATABASE_URL = dbMatch[1];

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const t = await p.user.findFirst({
    where: { firstName: 'Mouajria', lastName: 'Hattab', email: { contains: 'examanet-import.local' } }
  });
  if (!t) { console.log('No Mouajria'); process.exit(1); }
  const r = await p.resource.findMany({
    where: { teacherId: t.id, importedFrom: 'tunisiecollege.net' },
    select: { title: true, fileUrl: true }
  });
  console.log('Mouajria: ' + r.length + ' resources');
  // Sample
  for (const x of r.slice(0, 3)) console.log('  - ' + x.title);
  await p.$disconnect();
})();
