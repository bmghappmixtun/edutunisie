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
  
  let total = 0;
  for (const t of teachers) {
    const r = await p.resource.count({ 
      where: { teacherId: t.id, importedFrom: 'tunisiecollege.net' } 
    });
    if (r > 0) {
      console.log(t.firstName + ' ' + t.lastName + ': ' + r);
      total += r;
    }
  }
  
  const totalAll = await p.resource.count();
  const totalTC = await p.resource.count({ where: { importedFrom: 'tunisiecollege.net' } });
  console.log('\n=== TOTALS ===');
  console.log('Total resources: ' + totalAll);
  console.log('From tunisiecollege.net: ' + totalTC);
  console.log('From JotForm/manual: ' + (totalAll - totalTC));
  
  await p.$disconnect();
})();
