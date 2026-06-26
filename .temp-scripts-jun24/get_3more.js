const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const dbMatch = env.match(/DATABASE_URL="?([^"\n]+)"?/);
if (dbMatch) process.env.DATABASE_URL = dbMatch[1];

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const teachers = await p.user.findMany({
    where: {
      OR: [
        { firstName: 'Hafsi', lastName: 'Salem' },
        { firstName: 'Rahali', lastName: 'Ibrahim' },
        { firstName: 'Zantour', lastName: 'Hamdi' }
      ],
      email: { contains: 'examanet-import.local' }
    }
  });
  
  const result = [];
  for (const t of teachers) {
    const r = await p.resource.findMany({
      where: { teacherId: t.id, importedFrom: 'tunisiecollege.net' },
      select: { id: true, title: true, fileUrl: true }
    });
    for (const x of r) {
      result.push({
        teacher: t.firstName + ' ' + t.lastName,
        ...x
      });
    }
  }
  console.log(JSON.stringify(result, null, 2));
  await p.$disconnect();
})();
