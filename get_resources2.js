const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const teachers = await p.user.findMany({
    where: {
      email: { contains: 'examanet-import.local' },
      OR: [
        { firstName: 'Hajri' },
        { firstName: 'Dhouib' },
        { firstName: 'Sami' }  // Zouari too
      ]
    }
  });
  
  console.log(JSON.stringify(teachers.map(t => ({id: t.id, name: `${t.firstName} ${t.lastName}`})), null, 2));
  
  await p.$disconnect();
})();
