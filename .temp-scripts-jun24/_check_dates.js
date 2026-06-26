const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const r = await p.resource.findUnique({
    where: { id: 'cmqslll6f0001d609b37xwzio' },
    select: { 
      id: true, title: true, fileSize: true, originalFileSize: true,
      createdAt: true, updatedAt: true, importedAt: true
    }
  });
  console.log(JSON.stringify(r, null, 2));
  await p.$disconnect();
})();
