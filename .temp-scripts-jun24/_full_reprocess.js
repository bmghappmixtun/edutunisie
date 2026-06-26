
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const rs = await p.resource.findMany({
    where: { originalSubmissionId: { not: null } },
    select: { 
      id: true, title: true, fileUrl: true, pageCount: true,
      subject: { select: { nameFr: true } },
      class: { select: { nameFr: true } }
    }
  });
  const clean = rs.map(r => ({
    id: r.id,
    title: r.title,
    fileUrl: r.fileUrl,
    pageCount: r.pageCount,
    subject: r.subject?.nameFr || null,
    class: r.class?.nameFr || null
  }));
  console.log(JSON.stringify(clean));
  await p.$disconnect();
})();
