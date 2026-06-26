
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const rs = await p.resource.findMany({
    where: { originalSubmissionId: { not: null } },
    select: { 
      id: true, title: true, fileUrl: true,
      subject: { select: { nameFr: true } },
      class: { select: { nameFr: true } },
      teacher: { select: { firstName: true, lastName: true } },
    }
  });
  const cleaned = rs.map(r => ({
    id: r.id,
    title: r.title,
    fileUrl: r.fileUrl,
    subject: r.subject?.nameFr || null,
    class: r.class?.nameFr || null,
    teacher: r.teacher ? `${r.teacher.firstName || ''} ${r.teacher.lastName || ''}`.trim() : null,
  }));
  console.log(JSON.stringify(cleaned));
  await p.$disconnect();
})();
