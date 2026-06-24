const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const teacherIds = [
    'cmqsikl3n00003x52w3t1xb8x',  // Hajri
    'cmqslfa1w00006lgscbe5g8a0',  // Dhouib
    'f6936faa-8c9b-42fd-8200-fa2120e8c69a'  // Zouari
  ];
  
  const result = [];
  for (const tid of teacherIds) {
    const t = await p.user.findUnique({ where: { id: tid } });
    const resources = await p.resource.findMany({
      where: { teacherId: tid, importedFrom: 'tunisiecollege.net' },
      select: { id: true, title: true, fileUrl: true, fileKey: true }
    });
    for (const r of resources) {
      result.push({
        teacherName: `${t.firstName} ${t.lastName}`,
        teacherId: tid,
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
