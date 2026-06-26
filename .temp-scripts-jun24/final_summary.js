const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  console.log('='.repeat(70));
  console.log(' FINAL CLEANUP SUMMARY');
  console.log('='.repeat(70));
  
  console.log('\n=== Database state after cleanup ===\n');
  
  const totalUsers = await p.user.count();
  const totalTeachers = await p.user.count({ where: { role: 'TEACHER' } });
  const totalResources = await p.resource.count();
  const nullTeacher = await p.resource.count({ where: { teacherId: null } });
  
  const orphanTeachers = await p.$queryRaw`
    SELECT COUNT(*) as count FROM "User" u
    WHERE u.role = 'TEACHER'
    AND NOT EXISTS (SELECT 1 FROM "Resource" r WHERE r."teacherId" = u.id)
    AND NOT EXISTS (SELECT 1 FROM "TeacherFile" tf WHERE tf."teacherId" = u.id)
  `;
  
  console.log(`Total Users: ${totalUsers} (was 679 → now ${totalUsers})`);
  console.log(`Total Teachers: ${totalTeachers} (was 677 → now ${totalTeachers})`);
  console.log(`Total Resources: ${totalResources}`);
  console.log(`Resources with NULL teacher: ${nullTeacher} (was 4 → now ${nullTeacher})`);
  console.log(`Orphan teachers: ${orphanTeachers[0].count} (was 10 → now ${orphanTeachers[0].count})`);
  
  // Show the 2 still-unassigned resources
  console.log('\n=== Resources still with NULL teacher (unassignable) ===');
  const r = await p.resource.findMany({
    where: { teacherId: null },
    select: { id: true, title: true, slug: true }
  });
  for (const x of r) {
    console.log(`  ${x.title}`);
    console.log(`    slug: ${x.slug}`);
    console.log(`    url: https://examanet.com/ressources/${x.slug}`);
  }
  
  console.log('\n=== Top teachers after cleanup ===');
  const top = await p.$queryRaw`
    SELECT u."firstName" || ' ' || u."lastName" as name, COUNT(r.id) as total
    FROM "User" u
    JOIN "Resource" r ON r."teacherId" = u.id
    WHERE u.role = 'TEACHER'
    GROUP BY u.id, u."firstName", u."lastName"
    ORDER BY total DESC
    LIMIT 5
  `;
  for (const t of top) {
    console.log(`  ${t.name}: ${t.total}`);
  }
  
  await p.$disconnect();
})();
