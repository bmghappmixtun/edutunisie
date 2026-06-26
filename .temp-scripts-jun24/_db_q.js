
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const rs = await p.resource.findMany({
    where: { originalSubmissionId: { not: null } },
    select: { originalSubmissionId: true }
  });
  console.log(JSON.stringify(rs.map(r => r.originalSubmissionId)));
  await p.$disconnect();
})();
