const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const dbMatch = env.match(/DATABASE_URL="?([^"\n]+)"?/);
if (dbMatch) process.env.DATABASE_URL = dbMatch[1];

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  // Get teachers
  const teachers = await p.user.findMany({
    where: { email: { contains: 'examanet-import.local' } },
    select: { id: true, firstName: true, lastName: true, email: true }
  });
  
  // For each teacher, get resources
  const allRes = [];
  for (const t of teachers) {
    const resources = await p.resource.findMany({
      where: { teacherId: t.id, importedFrom: 'tunisiecollege.net' },
      select: { fileUrl: true, fileSize: true }
    });
    for (const r of resources) {
      allRes.push({ teacher: `${t.firstName} ${t.lastName}`, ...r });
    }
  }
  
  // Count URL formats per teacher
  const oldPattern = /imported\/[0-9]+-[A-Za-z0-9_-]{10,}\.pdf$/;
  const newPattern = /imported\/[0-9]+-[a-z0-9]+-[a-z0-9]{6}\.pdf$/;
  
  const summary = {};
  for (const r of allRes) {
    if (!summary[r.teacher]) summary[r.teacher] = { total: 0, newFmt: 0, oldFmt: 0 };
    summary[r.teacher].total++;
    if (newPattern.test(r.fileUrl)) summary[r.teacher].newFmt++;
    else if (oldPattern.test(r.fileUrl)) summary[r.teacher].oldFmt++;
  }
  
  for (const [name, stats] of Object.entries(summary)) {
    console.log(`${name}: ${stats.total} total | ${stats.newFmt} new URL | ${stats.oldFmt} old URL`);
  }
  
  await p.$disconnect();
})();
