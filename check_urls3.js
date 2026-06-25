const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const dbMatch = env.match(/DATABASE_URL="?([^"\n]+)"?/);
if (dbMatch) process.env.DATABASE_URL = dbMatch[1];

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const teachers = await p.user.findMany({
    where: { email: { contains: 'examanet-import.local' } },
    include: {
      resources: {
        where: { importedFrom: 'tunisiecollege.net' },
        select: { id: true, fileUrl: true, fileSize: true }
      }
    }
  });
  
  for (const t of teachers) {
    const oldFmt = t.resources.filter(r => /imported\/[0-9]+-[A-Za-z0-9_-]{10,}\.pdf$/.test(r.fileUrl)).length;
    const newFmt = t.resources.filter(r => /imported\/[0-9]+-[a-z0-9]+-[a-z0-9]{6}\.pdf$/.test(r.fileUrl)).length;
    console.log(`${t.firstName} ${t.lastName}: ${t.resources.length} resources (${newFmt} new URL, ${oldFmt} old URL)`);
  }
  
  await p.$disconnect();
})();
