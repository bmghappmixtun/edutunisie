const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const ids = process.argv.slice(2);
  const rs = await p.resource.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, fileUrl: true, originalSubmissionId: true }
  });
  console.log(JSON.stringify(rs, null, 2));
  await p.$disconnect();
})();
