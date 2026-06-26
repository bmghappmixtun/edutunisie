const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const r = await p.resource.findUnique({
    where: { slug: 'srie-dexercices-de-rvision-math-rvision2015-9me-2014-2015-sTXVdP' },
    select: { id: true, title: true, fileKey: true, fileUrl: true, originalSubmissionId: true }
  });
  console.log(JSON.stringify(r, null, 2));
  await p.$disconnect();
})();
