const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const dbMatch = env.match(/DATABASE_URL="?([^"\n]+)"?/);
if (dbMatch) process.env.DATABASE_URL = dbMatch[1];

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const teachers = await p.user.findMany({
    where: { email: { contains: 'examanet-import.local' } },
    select: { id: true, firstName: true, lastName: true }
  });
  
  const newPattern = /imported\/[0-9]+-[a-z0-9]+-[a-z0-9]{6}\.pdf$/;
  const oldSuffixPattern = /imported\/[0-9]+-[A-Za-z0-9_-]{10,}\.pdf$/;
  const zouariOrigPattern = /imported\/[0-9]+\.pdf$/;
  
  let grandTotal = 0;
  let grandNew = 0;
  
  for (const t of teachers) {
    const resources = await p.resource.findMany({
      where: { teacherId: t.id, importedFrom: 'tunisiecollege.net' },
      select: { fileUrl: true }
    });
    if (resources.length === 0) continue;
    let newFmt = 0, oldSuffix = 0, zouariOrig = 0;
    for (const r of resources) {
      if (newPattern.test(r.fileUrl)) newFmt++;
      else if (oldSuffixPattern.test(r.fileUrl)) oldSuffix++;
      else if (zouariOrigPattern.test(r.fileUrl)) zouariOrig++;
    }
    grandTotal += resources.length;
    grandNew += newFmt;
    console.log(t.firstName + ' ' + t.lastName + ': ' + resources.length + ' | new=' + newFmt + ' old=' + oldSuffix + ' orig=' + zouariOrig);
  }
  
  console.log('\n=== TOTAL ===');
  console.log('Total: ' + grandTotal);
  console.log('New URL: ' + grandNew + ' / ' + grandTotal);
  
  const totalAll = await p.resource.count();
  const totalTC = await p.resource.count({ where: { importedFrom: 'tunisiecollege.net' } });
  console.log('\nDB totals: ' + totalAll + ' resources, ' + totalTC + ' from tunisiecollege.net');
  
  await p.$disconnect();
})();
