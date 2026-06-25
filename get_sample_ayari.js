const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const dbMatch = env.match(/DATABASE_URL="?([^"\n]+)"?/);
if (dbMatch) process.env.DATABASE_URL = dbMatch[1];

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const ayari = await p.user.findFirst({
    where: { firstName: 'Ayari', lastName: 'Sallem', email: { contains: 'examanet-import.local' } }
  });
  const r = await p.resource.findFirst({
    where: { teacherId: ayari.id, importedFrom: 'tunisiecollege.net' }
  });
  console.log('Title:', r.title);
  console.log('URL:', r.fileUrl);
  await p.$disconnect();
})();
