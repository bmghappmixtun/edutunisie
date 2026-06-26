const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const total = await p.resource.count({ where: { originalSubmissionId: { not: null } } });
  const withDesc = await p.resource.count({ 
    where: { originalSubmissionId: { not: null }, description: { not: null } } 
  });
  const withMeta = await p.resource.count({ 
    where: { originalSubmissionId: { not: null }, metaDescription: { not: null } } 
  });
  console.log(`Total imported: ${total}`);
  console.log(`With description: ${withDesc}`);
  console.log(`With metaDescription: ${withMeta}`);
  console.log(`Need description: ${total - withDesc}`);
  await p.$disconnect();
})();
