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
    // Check if column already exists
    const checkResult = await prisma.$queryRaw<any[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Resource' AND column_name = 'originalTitle'
    `;

    if (checkResult.length > 0) {
      return NextResponse.json({ message: 'originalTitle column already exists', exists: true });
    }

    // Add the column
    await prisma.$executeRawUnsafe(`ALTER TABLE "Resource" ADD COLUMN "originalTitle" TEXT`);

    return NextResponse.json({ success: true, message: 'originalTitle column added' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
