
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const ids = process.argv.slice(2);
  const rs = await p.resource.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, fileUrl: true, subject: { select: { nameFr: true } }, class: { select: { nameFr: true } } }
  });
  console.log(JSON.stringify(rs));
  await p.$disconnect();
})();
