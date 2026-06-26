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
  if (!ayari) {
    console.log('No Ayari teacher found');
    process.exit(1);
  }
  
  const r = await p.resource.findMany({
    where: { teacherId: ayari.id, importedFrom: 'tunisiecollege.net' },
    select: { id: true, title: true, fileUrl: true, fileSize: true }
  });
  
  const newPattern = /imported\/[0-9]+-[a-z0-9]+-[a-z0-9]{6}\.pdf$/;
  let newCount = 0;
  for (const x of r) {
    if (newPattern.test(x.fileUrl)) newCount++;
  }
  
  console.log('Ayari Sallem: ' + r.length + ' resources (' + newCount + ' with new URL)');
  
  const byClass = {};
  for (const x of r) {
    const m = x.title.match(/(\d+)\s*[eè]me/);
    if (m) {
      const cls = m[1] + 'ème';
      byClass[cls] = (byClass[cls] || 0) + 1;
    }
  }
  for (const c of Object.keys(byClass).sort()) {
    console.log('  ' + c + ': ' + byClass[c]);
  }
  
  await p.$disconnect();
})();
