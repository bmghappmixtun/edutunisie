const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const teachers = await p.user.findMany({
    where: {
      OR: [
        { firstName: 'Hajri', lastName: 'Taoufik' },
        { firstName: 'Dhouib', lastName: 'Ridha' }
      ],
      email: { contains: 'examanet-import.local' }
    },
    include: {
      resources: {
        where: { importedFrom: 'tunisiecollege.net' },
        select: { id: true, title: true, fileUrl: true, fileKey: true }
      }
    }
  });
  const result = [];
  for (const t of teachers) {
    for (const r of t.resources) {
      result.push({
        teacherName: `${t.firstName} ${t.lastName}`,
        resourceId: r.id,
        title: r.title,
        fileUrl: r.fileUrl,
        fileKey: r.fileKey
      });
    }
  }
  console.log(JSON.stringify(result, null, 2));
  await p.$disconnect();
})();
