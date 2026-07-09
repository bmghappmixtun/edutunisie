import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const q = 'devoir';
const filters = { class: ['2eme-secondaire'] };

// Use $queryRawUnsafe to find class
const classRow = await prisma.$queryRawUnsafe(`SELECT id, slug, name_fr FROM "Class" WHERE slug = $1`, '2eme-secondaire');
console.log('Class row:', classRow);

await prisma.$disconnect();
