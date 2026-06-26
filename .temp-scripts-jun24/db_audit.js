const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  console.log('='.repeat(70));
  console.log(' EXAMANET DB AUDIT');
  console.log('='.repeat(70));
  
  // 1. Total counts
  console.log('\n=== TOTAL COUNTS ===');
  const totalUsers = await p.user.count();
  const totalResources = await p.resource.count();
  const totalTeachers = await p.user.count({ where: { role: 'TEACHER' } });
  const totalPublished = await p.resource.count({ where: { status: 'PUBLISHED' } });
  const totalDrafts = await p.resource.count({ where: { status: 'DRAFT' } });
  
  console.log(`Total Users: ${totalUsers}`);
  console.log(`  Teachers: ${totalTeachers}`);
  console.log(`Total Resources: ${totalResources}`);
  console.log(`  Published: ${totalPublished}`);
  console.log(`  Drafts: ${totalDrafts}`);
  
  // 2. TunisIEcollege imports
  const tcImports = await p.resource.count({ 
    where: { originalSubmissionId: { not: null } } 
  });
  console.log(`\nTunisiecollege.net imports: ${tcImports}`);
  
  // 3. Duplicates by slug
  console.log('\n=== DUPLICATE SLUGS ===');
  const slugDups = await p.$queryRaw`SELECT slug, COUNT(*) as count FROM "Resource" GROUP BY slug HAVING COUNT(*) > 1`;
  console.log(`Found ${slugDups.length} duplicate slug groups`);
  
  // 4. Duplicates by title
  console.log('\n=== DUPLICATE TITLES (case-insensitive) ===');
  const titleDups = await p.$queryRaw`
    SELECT LOWER(title) as ltitle, COUNT(*) as count, MIN(id) as first_id, array_agg(id) as ids
    FROM "Resource"
    GROUP BY LOWER(title)
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 10
  `;
  console.log(`Found ${titleDups.length} duplicate title groups (showing top 10)`);
  for (const r of titleDups) {
    console.log(`  "${r.ltitle.slice(0,55)}...": ${r.count} copies, kept=${r.first_id}`);
  }
  // 5. Duplicate tunisiecollege fileIds
  console.log('\n=== DUPLICATE TUNISIECOLLEGE FILE IDS ===');
  const fidDups = await p.$queryRaw`
    SELECT "originalSubmissionId", COUNT(*) as count
    FROM "Resource"
    WHERE "originalSubmissionId" IS NOT NULL
    GROUP BY "originalSubmissionId"
    HAVING COUNT(*) > 1
  `;
  console.log(`Found ${fidDups.length} duplicate fileId groups`);
  
  // 6. Orphan teachers (no resources uploaded)
  console.log('\n=== TEACHERS WITHOUT UPLOADED RESOURCES ===');
  const orphanTeachers = await p.$queryRaw`
    SELECT COUNT(*) FROM "User" u
    WHERE u.role = 'TEACHER'
    AND NOT EXISTS (SELECT 1 FROM "Resource" r WHERE r."teacherId" = u.id)
  `;
  console.log(`Teachers with no uploaded resources: ${orphanTeachers[0].count}`);
  
  // 7. Orphan teachers (more details)
  const orphanList = await p.$queryRaw`
    SELECT u.id, u.email, u."firstName", u."lastName", u."createdAt"
    FROM "User" u
    WHERE u.role = 'TEACHER'
    AND NOT EXISTS (SELECT 1 FROM "Resource" r WHERE r."teacherId" = u.id)
    ORDER BY u."createdAt" DESC
    LIMIT 15
  `;
  if (orphanList.length > 0) {
    console.log('Sample:');
    for (const u of orphanList.slice(0, 5)) {
      console.log(`  ${u.firstName} ${u.lastName} <${u.email}> (${u.createdAt.toISOString().slice(0,10)})`);
    }
  }
  
  // 8. File size distribution
  console.log('\n=== FILE SIZE STATS ===');
  const sizeStats = await p.$queryRaw`
    SELECT 
      MIN("fileSize") as min,
      MAX("fileSize") as max,
      AVG("fileSize")::int as avg,
      COUNT(*) FILTER (WHERE "fileSize" = 0) as zero_size,
      COUNT(*) FILTER (WHERE "fileSize" IS NULL) as null_size
    FROM "Resource"
  `;
  const s = sizeStats[0];
  console.log(`Min: ${(s.min/1024).toFixed(1)} KB`);
  console.log(`Max: ${(s.max/1024/1024).toFixed(1)} MB`);
  console.log(`Avg: ${(s.avg/1024).toFixed(1)} KB`);
  console.log(`Zero-size: ${s.zero_size}`);
  console.log(`Null-size: ${s.null_size}`);
  
  // 9. Duplicate file URLs (should be 0)
  console.log('\n=== DUPLICATE FILE URLS ===');
  const blobDups = await p.$queryRaw`
    SELECT "fileUrl", COUNT(*) as count
    FROM "Resource"
    WHERE "fileUrl" IS NOT NULL
    GROUP BY "fileUrl"
    HAVING COUNT(*) > 1
  `;
  console.log(`Found ${blobDups.length} duplicate fileUrl groups`);
  
  // 10. Year distribution
  console.log('\n=== YEAR DISTRIBUTION (top 10) ===');
  const yearDist = await p.$queryRaw`
    SELECT year, COUNT(*) as count
    FROM "Resource"
    WHERE year IS NOT NULL
    GROUP BY year
    ORDER BY year DESC
    LIMIT 10
  `;
  for (const r of yearDist) {
    console.log(`  ${r.year}: ${r.count}`);
  }
  
  // 11. Subject distribution
  console.log('\n=== TOP SUBJECTS ===');
  const subjectDist = await p.$queryRaw`
    SELECT s."nameFr", COUNT(*) as count
    FROM "Resource" r
    JOIN "Subject" s ON r."subjectId" = s.id
    GROUP BY s."nameFr"
    ORDER BY count DESC
    LIMIT 10
  `;
  for (const r of subjectDist) {
    console.log(`  ${r.nameFr}: ${r.count}`);
  }
  
  // 12. Top teachers
  console.log('\n=== TOP TEACHERS BY RESOURCE COUNT ===');
  const teacherStats = await p.$queryRaw`
    SELECT u."firstName" || ' ' || u."lastName" as name, COUNT(r.id) as total
    FROM "User" u
    LEFT JOIN "Resource" r ON r."teacherId" = u.id
    WHERE u.role = 'TEACHER'
    GROUP BY u.id, u."firstName", u."lastName"
    ORDER BY total DESC
    LIMIT 10
  `;
  for (const t of teacherStats) {
    console.log(`  ${t.name}: ${t.total}`);
  }
  
  // 13. Type distribution
  console.log('\n=== TYPE DISTRIBUTION ===');
  const typeDist = await p.$queryRaw`
    SELECT type, COUNT(*) as count
    FROM "Resource"
    WHERE type IS NOT NULL
    GROUP BY type
    ORDER BY count DESC
  `;
  for (const r of typeDist) {
    console.log(`  ${r.type}: ${r.count}`);
  }
  
  // 14. Class distribution
  console.log('\n=== CLASS DISTRIBUTION ===');
  const classDist = await p.$queryRaw`
    SELECT c."nameFr", COUNT(r.id) as count
    FROM "Resource" r
    JOIN "Class" c ON r."classId" = c.id
    GROUP BY c."nameFr"
    ORDER BY count DESC
  `;
  for (const r of classDist) {
    console.log(`  ${r.nameFr}: ${r.count}`);
  }
  
  // 15. Trimestre
  console.log('\n=== TRIMESTER DISTRIBUTION ===');
  const triDist = await p.$queryRaw`
    SELECT trimester, COUNT(*) as count
    FROM "Resource"
    WHERE trimester IS NOT NULL
    GROUP BY trimester
    ORDER BY trimester
  `;
  for (const r of triDist) {
    console.log(`  ${r.trimester}: ${r.count}`);
  }
  
  // 16. Resources missing teacher (null teacherId) - rare but possible
  console.log('\n=== INTEGRITY CHECKS ===');
  const noTeacher = await p.$queryRaw`SELECT COUNT(*) as count FROM "Resource" WHERE "teacherId" IS NULL`;
  console.log(`Resources with NULL teacher: ${noTeacher[0].count}`);
  
  console.log('\n' + '='.repeat(70));
  console.log(' AUDIT COMPLETE');
  console.log('='.repeat(70));
  
  await p.$disconnect();
})();
