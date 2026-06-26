const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const dbMatch = env.match(/DATABASE_URL="?([^"\n]+)"?/);
if (dbMatch) process.env.DATABASE_URL = dbMatch[1];

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const zouari = await p.user.findFirst({ where: { firstName: 'Sami', lastName: 'Zouari' } });
  const r = await p.resource.findFirst({ where: { teacherId: zouari.id }, select: { fileUrl: true } });
  console.log('Zouari sample URL:', r.fileUrl);
  await p.$disconnect();
})();
