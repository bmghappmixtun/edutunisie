const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const fs = require('fs');
(async () => {
  const rs = await p.resource.findMany({
    where: { originalSubmissionId: { not: null } },
    select: { 
      id: true, title: true, fileUrl: true, description: true,
      subject: { select: { slug: true, nameFr: true } },
      class: { select: { slug: true, nameFr: true } },
      teacher: { select: { firstName: true, lastName: true } },
    }
  });
  for (let i = rs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rs[i], rs[j]] = [rs[j], rs[i]];
  }
  const sample = rs.slice(0, 10).map(r => ({
    id: r.id, title: r.title, fileUrl: r.fileUrl,
    subject: r.subject?.nameFr, class: r.class?.nameFr,
    teacher: r.teacher ? `${r.teacher.firstName || ''} ${r.teacher.lastName || ''}`.trim() : null
  }));
  fs.writeFileSync('/workspace/pdf-summarize-test/sample.json', JSON.stringify(sample, null, 2));
  console.log('saved');
  await p.$disconnect();
})();
