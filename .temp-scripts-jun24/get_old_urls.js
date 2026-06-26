const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const dbMatch = env.match(/DATABASE_URL="?([^"\n]+)"?/);
if (dbMatch) process.env.DATABASE_URL = dbMatch[1];

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const r = await p.resource.findMany({
    where: { importedFrom: 'tunisiecollege.net' },
    select: { id: true, title: true, fileUrl: true, teacherId: true }
  });
  
  const newPattern = /imported\/[0-9]+-[a-z0-9]+-[a-z0-9]{6}\.pdf$/;
  const oldSuffixPattern = /imported\/[0-9]+-[A-Za-z0-9_-]{10,}\.pdf$/;
  
  const old = r.filter(x => !newPattern.test(x.fileUrl));
  
  // Get teacher names
  const teacherIds = [...new Set(old.map(x => x.teacherId))];
  const teachers = await p.user.findMany({
    where: { id: { in: teacherIds } },
    select: { id: true, firstName: true, lastName: true }
  });
  const tMap = {};
  for (const t of teachers) tMap[t.id] = t.firstName + ' ' + t.lastName;
  
  const result = old.map(x => ({
    teacher: tMap[x.teacherId],
    ...x
  }));
  console.log(JSON.stringify(result, null, 2));
  await p.$disconnect();
})();
