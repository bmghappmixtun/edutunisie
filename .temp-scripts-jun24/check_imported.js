const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const p = new PrismaClient();
(async () => {
  // Get target fileIds from remaining_5_10.json
  const remaining = JSON.parse(fs.readFileSync('/workspace/imports/remaining_5_10.json'));
  const targetIds = new Set();
  for (const prof of remaining) {
    for (const file of prof.files) {
      targetIds.add(String(file.fileId));
    }
  }
  console.log(`Target file IDs to import: ${targetIds.size}`);

  // Find resources created today with originalFileName matching our patterns
  const recent = await p.resource.findMany({
    where: { createdAt: { gte: new Date('2026-06-25T17:00:00Z') } },
    select: { title: true, createdAt: true, fileKey: true },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`Resources created today since 17:00: ${recent.length}`);

  // Check which target IDs have been imported by looking at fileKey patterns
  // fileKey format: teacher-library/{teacherId}/imported/{fileId}-{random}-{resourceId}.pdf
  const doneIds = new Set();
  for (const r of recent) {
    const m = r.fileKey.match(/imported\/(\d+)-/);
    if (m && targetIds.has(m[1])) {
      doneIds.add(m[1]);
    }
  }
  console.log(`Already imported (from target list): ${doneIds.size}`);
  console.log(`Remaining to do: ${targetIds.size - doneIds.size}`);

  // Print first 5 imported for verification
  console.log("\nFirst 5 imported fileKeys:");
  for (const r of recent.slice(0, 5)) {
    console.log(`  ${r.title}: ${r.fileKey}`);
  }

  await p.$disconnect();
})();
