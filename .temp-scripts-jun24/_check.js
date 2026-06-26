const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  // Get a recent tunisiecollege import that we haven't fixed
  const r = await p.resource.findFirst({
    where: { 
      originalSubmissionId: '5719572313',  // one from the recent batch
    },
    select: { id: true, originalSubmissionId: true, title: true, fileUrl: true, fileKey: true, createdAt: true }
  });
  console.log(JSON.stringify(r, null, 2));
  await p.$disconnect();
})();
