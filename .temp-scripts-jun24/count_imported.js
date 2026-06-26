const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const fs = require('fs');
(async () => {
  const all = await p.resource.findMany({
    where: { originalSubmissionId: { not: null } },
    select: { originalSubmissionId: true }
  });
  const imported = new Set(all.map(r => String(r.originalSubmissionId)));
  console.log(`Total imported (all-time): ${imported.size}`);
  // Get the 5_10 targets
  const remaining = JSON.parse(fs.readFileSync('/workspace/imports/remaining_5_10.json'));
  const targetIds = new Set();
  for (const prof of remaining) {
    for (const file of prof.files) {
      targetIds.add(String(file.fileId));
    }
  }
  console.log(`5_10 targets: ${targetIds.size}`);
  // What's in DB from 5_10?
  const from5_10 = [...targetIds].filter(id => imported.has(id));
  console.log(`5_10 in DB: ${from5_10.length}`);
  // What's missing?
  const missing = [...targetIds].filter(id => !imported.has(id));
  console.log(`5_10 missing: ${missing.length}`);
  if (missing.length > 0 && missing.length < 30) {
    // Get prof name for missing
    for (const prof of remaining) {
      for (const file of prof.files) {
        if (missing.includes(String(file.fileId))) {
          console.log(`  Missing: ${prof.teacher} - ${file.title}`);
        }
      }
    }
  }
  await p.$disconnect();
})();
