const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const p = new PrismaClient();
(async () => {
  const remaining = JSON.parse(fs.readFileSync('/workspace/imports/remaining_5_10.json'));
  const all = await p.resource.findMany({
    where: { originalSubmissionId: { not: null } },
    select: { originalSubmissionId: true }
  });
  const imported = new Set(all.map(r => String(r.originalSubmissionId)));
  
  const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  const missing = [];
  for (const prof of remaining) {
    for (const file of prof.files) {
      const fid = String(file.fileId);
      if (!imported.has(fid)) {
        missing.push({
          prof: prof.teacher,
          fileId: fid,
          title: file.title,
          arabic: ARABIC_RE.test(file.title || ''),
          url: file.downloadUrl,
        });
      }
    }
  }
  console.log(`Total missing: ${missing.length}`);
  const arabicMissing = missing.filter(m => m.arabic);
  const frenchMissing = missing.filter(m => !m.arabic);
  console.log(`Arabic (will skip): ${arabicMissing.length}`);
  console.log(`French (need import): ${frenchMissing.length}`);
  console.log('\nFrench missing:');
  for (const m of frenchMissing) {
    console.log(`  ${m.prof}: ${m.title}`);
  }
  // Save list of French files to import
  fs.writeFileSync('/workspace/imports/french_missing.json', JSON.stringify(frenchMissing, null, 2));
  console.log('\nSaved to french_missing.json');
  
  await p.$disconnect();
})();
