import { config } from 'dotenv';
config({ path: '.env.local' });

import('./src/lib/invitation').then(async (mod) => {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  // Pick a teacher with good file count
  const teacher = await prisma.user.findFirst({
    where: { email: 'ahmedtlich@gmail.com' },
    select: { id: true, firstName: true, lastName: true, email: true }
  });
  if (!teacher) { console.error('No teacher'); process.exit(1); }
  console.log('Teacher:', teacher.firstName, teacher.lastName, teacher.email);
  const fileCount = await prisma.resource.count({
    where: { teacherId: teacher.id, status: 'PUBLISHED' }
  });
  console.log('Files:', fileCount);

  // Render the email using the internal function
  // We need to manually render because sendInvitationEmail needs an invitation record
  const html = mod['renderInvitationEmail']?.({
    teacherName: `${teacher.firstName} ${teacher.lastName}`,
    teacherEmail: teacher.email,
    acceptUrl: 'https://examanet.com/invitation/TEST-TOKEN-123',
    landingUrl: 'https://examanet.com/enseignants/rejoindre',
    tempPassword: 'Abc1234X',
    fileCount,
    customMessage: null,
    expiresAt: new Date(Date.now() + 10*24*60*60*1000),
  });
  console.log('Render function exists:', typeof html);
  if (html) {
    const fs = await import('fs');
    fs.writeFileSync('/tmp/test-invitation.html', html);
    console.log('Saved to /tmp/test-invitation.html, size:', html.length);
  } else {
    console.log('No render function exposed. Sending real invitation...');
    // Create a test invitation
    const { invitation, tempPassword } = await mod.createInvitation(teacher.id, undefined, null);
    console.log('Created invitation, temp password:', tempPassword);
    const result = await mod.sendInvitationEmail(invitation.id, tempPassword);
    console.log('Send result:', JSON.stringify(result, null, 2));
  }
  await prisma.$disconnect();
});
