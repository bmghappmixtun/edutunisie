const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const r = await p.resource.findUnique({
    where: { slug: 'srie-dexercices-de-rvision-math-rvision2015-9me-2014-2015-sTXVdP' },
    include: { teacher: true }
  });
  if (r) {
    console.log(JSON.stringify({
      title: r.title,
      fileId: r.fileId,
      originalFileName: r.originalFileName,
      originalFormat: r.originalFormat,
      originalFileKey: r.originalFileKey,
      fileUrl: r.fileUrl,
      metadata: r.metadata,
    }, null, 2));
  }
  await p.$disconnect();
})();
