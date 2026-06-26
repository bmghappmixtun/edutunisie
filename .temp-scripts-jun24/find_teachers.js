const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  // Search for Arayssi and Chaabane
  const teachers = await p.$queryRaw`
    SELECT id, "firstName", "lastName", email
    FROM "User"
    WHERE role = 'TEACHER' AND (
      LOWER("firstName") LIKE '%arayssi%'
      OR LOWER("lastName") LIKE '%arayssi%'
      OR LOWER("firstName") LIKE '%chaabane%'
      OR LOWER("lastName") LIKE '%chaabane%'
      OR LOWER("firstName") LIKE '%mohamed%'
      OR LOWER("lastName") LIKE '%mohamed%'
      OR LOWER("firstName") LIKE '%mounir%'
      OR LOWER("lastName") LIKE '%mounir%'
    )
    ORDER BY "firstName", "lastName"
  `;
  
  console.log('Teachers matching Arayssi/Chaabane/Mohamed/Mounir:');
  for (const t of teachers) {
    console.log(`  ${t.firstName} ${t.lastName} <${t.email}> (id: ${t.id})`);
  }
  
  await p.$disconnect();
})();
