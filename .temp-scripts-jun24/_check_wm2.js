const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const p = new PrismaClient();
(async () => {
  const flagged = JSON.parse(fs.readFileSync('/workspace/imports/pdfs_with_watermark_final.json'));
  const ids = flagged.map(f => f.id);
  console.error(`Querying ${ids.length} IDs...`);
  const rs = await p.resource.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, fileUrl: true, originalSubmissionId: true }
  });
  console.log(JSON.stringify(rs, null, 2));
  await p.$disconnect();
})();
