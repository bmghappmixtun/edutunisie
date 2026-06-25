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
  
  // New URL pattern (from force_reupload / overwrite endpoint)
  const newPattern = /imported\/[0-9]+-[a-z0-9]+-[a-z0-9]{6}\.pdf$/;
  // Old addRandomSuffix pattern
  const oldSuffixPattern = /imported\/[0-9]+-[A-Za-z0-9_-]{10,}\.pdf$/;
  // Zouari original (no suffix at all)
  const zouariOrigPattern = /imported\/[0-9]+\.pdf$/;
  
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
    console.log(t.firstName + ' ' + t.lastName + ': ' + resources.length + ' | ' + newFmt + ' new | ' + oldSuffix + ' old-suffix | ' + zouariOrig + ' zouari-orig');
  }
  
  // Total
  const total = await p.resource.count();
  const tunisiecollege = await p.resource.count({ where: { importedFrom: 'tunisiecollege.net' } });
  const jotform = await p.resource.count({ where: { importedFrom: { not: 'tunisiecollege.net' } } });
  console.log('\n=== TOTALS ===');
  console.log('Total resources: ' + total);
  console.log('tunisiecollege.net: ' + tunisiecollege);
  console.log('JotForm/manual: ' + jotform);
  
  await p.$disconnect();
})();
