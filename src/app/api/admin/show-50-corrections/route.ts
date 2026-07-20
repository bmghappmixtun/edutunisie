import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const maxDuration = 30;

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  if (token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const samples = await prisma.$queryRaw<any[]>`
      SELECT b."numericId", b."oldTitle", b."newTitle"
      FROM "ResourceTitleBackup" b
      ORDER BY b."numericId" ASC
      LIMIT ${limit}
    `;

    return NextResponse.json({
      total_backed_up: await prisma.resourceTitleBackup.count(),
      samples: samples.map((s: any) => ({
        id: Number(s.numericId),
        before: s.oldTitle,
        after: s.newTitle,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
