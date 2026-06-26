const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const r = await p.resource.findFirst({
    where: { originalSubmissionId: { not: null } },
    select: {
      id: true, title: true, fileKey: true, fileUrl: true,
      originalSubmissionId: true, originalFileKey: true, originalFileName: true,
      originalFormat: true,
      teacher: { select: { firstName: true, lastName: true } },
    }
  });
  console.log(JSON.stringify(r, null, 2));
  await p.$disconnect();
})();
