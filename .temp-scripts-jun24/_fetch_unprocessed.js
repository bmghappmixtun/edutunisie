const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const fs = require('fs');

const BATCH_NUM = parseInt(process.argv[2] || '0');
const BATCH_SIZE = parseInt(process.argv[3] || '20');
const OUT_DIR = process.argv[4] || '/workspace/seo-production/batches';

(async () => {
  const skip = BATCH_NUM * BATCH_SIZE;
  
  const resources = await p.resource.findMany({
    where: { 
      originalSubmissionId: { not: null },
      OR: [
        { description: null },
        { descriptionGeneratedAt: null }
      ]
    },
    select: { 
      id: true, title: true, fileUrl: true, language: true,
      subject: { select: { nameFr: true, nameAr: true } },
      class: { select: { nameFr: true, nameAr: true } },
      teacher: { select: { firstName: true, lastName: true } },
    },
    skip,
    take: BATCH_SIZE,
    orderBy: { createdAt: 'asc' }
  });
  
  const total = await p.resource.count({ 
    where: { 
      originalSubmissionId: { not: null },
      OR: [
        { description: null },
        { descriptionGeneratedAt: null }
      ]
    }
  });
  
  console.log(`Total remaining: ${total}`);
  console.log(`Batch ${BATCH_NUM}: ${resources.length} resources (offset ${skip})`);
  
  const out = resources.map(r => ({
    id: r.id,
    title: r.title,
    fileUrl: r.fileUrl,
    subject: r.subject?.nameFr,
    class: r.class?.nameFr,
    teacher: r.teacher ? `${r.teacher.firstName || ''} ${r.teacher.lastName || ''}`.trim() : null,
    existingLanguage: r.language
  }));
  
  const outPath = `${OUT_DIR}/batch_${String(BATCH_NUM).padStart(3, '0')}.json`;
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Saved ${resources.length} to ${outPath}`);
  
  await p.$disconnect();
})();
