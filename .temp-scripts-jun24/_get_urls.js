const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const p = new PrismaClient();
(async () => {
  const flagged = JSON.parse(fs.readFileSync('/workspace/imports/pdfs_with_watermark_final.json'));
  const ids = flagged.slice(0, 10).map(f => f.id);
  const rs = await p.resource.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, fileUrl: true, fileKey: true, originalFileKey: true }
  });
  console.log(JSON.stringify(rs, null, 2));
  await p.$disconnect();
})();
