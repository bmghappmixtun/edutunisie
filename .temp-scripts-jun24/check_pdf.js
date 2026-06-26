const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const r = await p.resource.findUnique({
    where: { slug: 'srie-dexercices-de-rvision-math-rvision2015-9me-2014-2015-sTXVdP' },
    include: { subject: true, class: true, teacher: true }
  });
  if (!r) {
    console.log('Not found, trying slug like search...');
    const all = await p.resource.findMany({
      where: { slug: { contains: 'srie-dexercices-de-rvision' } },
      select: { id: true, slug: true, title: true, fileUrl: true, fileKey: true }
    });
    console.log(JSON.stringify(all, null, 2));
  } else {
    console.log(JSON.stringify({
      id: r.id,
      title: r.title,
      fileUrl: r.fileUrl,
      fileKey: r.fileKey,
      fileSize: r.fileSize,
      teacher: r.teacher ? `${r.teacher.firstName} ${r.teacher.lastName}` : null,
    }, null, 2));
  }
  await p.$disconnect();
})();
