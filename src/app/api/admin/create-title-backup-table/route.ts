import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const maxDuration = 30;

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Create backup table if not exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ResourceTitleBackup" (
        "resourceId" TEXT NOT NULL PRIMARY KEY,
        "numericId" INTEGER NOT NULL,
        "oldTitle" TEXT NOT NULL,
        "newTitle" TEXT,
        "regeneratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "regeneratedBy" TEXT DEFAULT 'one-shot-fix'
      )
    `);

    // Add index on numericId for quick lookups
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ResourceTitleBackup_numericId_idx" ON "ResourceTitleBackup" ("numericId")
    `);

    return NextResponse.json({ success: true, message: 'ResourceTitleBackup table ready' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
