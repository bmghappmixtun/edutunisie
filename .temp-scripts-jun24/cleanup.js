const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  console.log('='.repeat(70));
  console.log(' CLEANUP');
  console.log('='.repeat(70));
  
  // PART 1: Find and analyze orphan teachers
  console.log('\n=== PART 1: Analyzing orphan teachers ===\n');
  
  const toDelete = await p.$queryRaw`
    SELECT u.id, u.email, u."firstName", u."lastName"
    FROM "User" u
    WHERE u.role = 'TEACHER'
    AND NOT EXISTS (SELECT 1 FROM "Resource" r WHERE r."teacherId" = u.id)
    AND NOT EXISTS (SELECT 1 FROM "TeacherFile" tf WHERE tf."teacherId" = u.id)
  `;
  
  console.log(`Found ${toDelete.length} orphan teachers`);
  
  // Check each for references in other tables
  let safeToDelete = [];
  let unsafe = [];
  for (const u of toDelete) {
    const asApprover = await p.resource.count({ where: { approvedById: u.id } });
    const asEditor = await p.resource.count({ where: { editReviewedById: u.id } });
    const asEditReq = await p.resource.count({ where: { editRequestedById: u.id } });
    const asCommenter = await p.comment.count({ where: { userId: u.id } });
    const asRating = await p.rating.count({ where: { userId: u.id } });
    const asFav = await p.favorite.count({ where: { userId: u.id } });
    const asFollower = await p.user.count({ where: { approvedById: u.id } });
    
    const refs = asApprover + asEditor + asEditReq + asCommenter + asRating + asFav + asFollower;
    if (refs === 0) {
      safeToDelete.push(u);
    } else {
      unsafe.push({ ...u, refs });
    }
  }
  
  console.log(`Safe to delete: ${safeToDelete.length}`);
  console.log(`Unsafe (has refs): ${unsafe.length}`);
  
  // PART 2: Delete safe ones
  console.log('\n=== PART 2: Deleting safe orphan teachers ===\n');
  let deleted = 0;
  for (const u of safeToDelete) {
    try {
      await p.user.delete({ where: { id: u.id } });
      console.log(`  ✅ Deleted: ${u.firstName} ${u.lastName} <${u.email}>`);
      deleted++;
    } catch (e) {
      console.log(`  ❌ Failed: ${u.email} - ${e.message.slice(0, 100)}`);
    }
  }
  console.log(`\nDeleted ${deleted}/${safeToDelete.length} orphan teachers`);
  
  // PART 3: Assign null-teacher resources
  console.log('\n=== PART 3: Assign null-teacher resources ===\n');
  
  const nullTeacher = await p.resource.findMany({
    where: { teacherId: null },
    select: { id: true, title: true }
  });
  
  function extractTeacher(title) {
    const m = title.match(/(Mr|Mme|Mlle)\s+([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*?)\s*$/);
    if (!m) return null;
    const parts = m[2].trim().split(/\s+/);
    return {
      marker: m[1],
      firstName: parts[0],
      lastName: parts.slice(1).join(' ') || parts[0]
    };
  }
  
  let assigned = 0;
  for (const r of nullTeacher) {
    const parsed = extractTeacher(r.title);
    if (!parsed) {
      console.log(`  ⚠️ Cannot extract teacher from: ${r.title.slice(0, 70)}`);
      continue;
    }
    
    // Find teacher (case-insensitive, contains for lastName to handle variants like "Mr chaabane mounir" -> "Mounir Chaabane")
    const firstNameLower = parsed.firstName.toLowerCase();
    const lastNameLower = parsed.lastName.toLowerCase();
    
    // Try exact match first
    let teacher = await p.user.findFirst({
      where: {
        role: 'TEACHER',
        firstName: { equals: parsed.firstName, mode: 'insensitive' }
      },
      select: { id: true, firstName: true, lastName: true }
    });
    
    // If not found, try by email pattern or last name match
    if (!teacher) {
      teacher = await p.user.findFirst({
        where: {
          role: 'TEACHER',
          email: { contains: firstNameLower, mode: 'insensitive' }
        },
        select: { id: true, firstName: true, lastName: true }
      });
    }
    
    if (!teacher) {
      console.log(`  ⚠️ Teacher not found: ${parsed.firstName} "${parsed.lastName}"`);
      continue;
    }
    
    await p.resource.update({
      where: { id: r.id },
      data: { teacherId: teacher.id }
    });
    console.log(`  ✅ "${r.title.slice(0, 50)}..." → ${teacher.firstName} ${teacher.lastName}`);
    assigned++;
  }
  
  // VERIFY
  console.log('\n=== VERIFICATION ===');
  const remainingNull = await p.resource.count({ where: { teacherId: null } });
  const remainingOrphans = await p.$queryRaw`
    SELECT COUNT(*) as count FROM "User" u
    WHERE u.role = 'TEACHER'
    AND NOT EXISTS (SELECT 1 FROM "Resource" r WHERE r."teacherId" = u.id)
    AND NOT EXISTS (SELECT 1 FROM "TeacherFile" tf WHERE tf."teacherId" = u.id)
  `;
  const totalUsers = await p.user.count();
  const totalTeachers = await p.user.count({ where: { role: 'TEACHER' } });
  console.log(`Resources still with NULL teacher: ${remainingNull}`);
  console.log(`Orphan teachers remaining: ${remainingOrphans[0].count}`);
  console.log(`Total users: ${totalUsers}, Teachers: ${totalTeachers}`);
  
  await p.$disconnect();
})();
