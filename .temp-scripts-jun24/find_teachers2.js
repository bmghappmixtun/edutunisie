const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  // The titles mention "Mr Arayssi Mohame" and "Mr chaabane mounir"  
  // These might be stored with different spellings
  const all = await p.$queryRaw`
    SELECT id, "firstName", "lastName", email
    FROM "User"
    WHERE role = 'TEACHER' AND status = 'ACTIVE'
    AND (
      LOWER("firstName") LIKE '%arays%'
      OR LOWER("lastName") LIKE '%arays%'
      OR LOWER("firstName") LIKE '%chaaban%'
      OR LOWER("lastName") LIKE '%chaaban%'
      OR LOWER("firstName") LIKE '%chaban%'
      OR LOWER("lastName") LIKE '%chaban%'
    )
  `;
  
  console.log('Broader search:');
  for (const t of all) {
    console.log(`  ${t.firstName} ${t.lastName} <${t.email}> (id: ${t.id})`);
  }
  
  // Also try chaabani (with i)
  const alt = await p.$queryRaw`
    SELECT id, "firstName", "lastName", email
    FROM "User"
    WHERE role = 'TEACHER' AND status = 'ACTIVE'
    AND (
      LOWER("firstName") LIKE '%chaaban%'
      OR LOWER("lastName") LIKE '%chaaban%'
    )
  `;
  console.log('\nChaabani search:');
  for (const t of alt) {
    console.log(`  ${t.firstName} ${t.lastName} <${t.email}>`);
  }
  
  // Show the actual title text to understand
  const r = await p.resource.findMany({
    where: { teacherId: null },
    select: { id: true, title: true }
  });
  console.log('\nRemaining null-teacher resources:');
  for (const x of r) {
    console.log(`  ${x.title}`);
  }
  
  await p.$disconnect();
})();
