const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const dbMatch = env.match(/DATABASE_URL="?([^"\n]+)"?/);
if (dbMatch) process.env.DATABASE_URL = dbMatch[1];

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const dhouib = await p.user.findFirst({ where: { firstName: 'Dhouib', lastName: 'Ridha' } });
  const r = await p.resource.findFirst({ where: { teacherId: dhouib.id }, select: { fileUrl: true, title: true } });
  console.log(`${r.title}\n${r.fileUrl}`);
  await p.$disconnect();
})();
