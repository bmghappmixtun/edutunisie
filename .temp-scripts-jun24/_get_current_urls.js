const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const p = new PrismaClient();
(async () => {
  const flagged = JSON.parse(fs.readFileSync('/workspace/imports/pdfs_with_watermark_final.json'));
  const ids = flagged.map(f => f.id);
  console.error(`Querying ${ids.length} IDs...`);
  
  // Process in batches of 100
  const all = [];
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const rs = await p.resource.findMany({
      where: { id: { in: batch } },
      select: { id: true, fileKey: true, fileUrl: true }
    });
    all.push(...rs);
    console.error(`  ${Math.min(i+100, ids.length)}/${ids.length}`);
  }
  
  fs.writeFileSync('/workspace/imports/flagged_current.json', JSON.stringify(all, null, 2));
  console.error(`Saved ${all.length} entries`);
  await p.$disconnect();
})();
