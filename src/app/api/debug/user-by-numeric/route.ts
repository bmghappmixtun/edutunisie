import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const results: any = { input: id };

  try {
    const byNumeric = await prisma.$queryRawUnsafe<Array<{ id: string; numericId: number | null }>>(
      `SELECT id, "numericId" FROM "User" WHERE "numericId" = $1 LIMIT 5`,
      parseInt(id, 10)
    );
    results.byNumericRaw = byNumeric;
  } catch (e: any) {
    results.byNumericRawError = e.message;
  }

  try {
    const byCuid = await prisma.$queryRawUnsafe<Array<{ id: string; numericId: number | null }>>(
      `SELECT id, "numericId" FROM "User" WHERE "id" = $1 LIMIT 5`,
      id
    );
    results.byCuidRaw = byCuid;
  } catch (e: any) {
    results.byCuidRawError = e.message;
  }

  try {
    const findByNumeric = await prisma.user.findUnique({
      where: { numericId: parseInt(id, 10) },
      select: { id: true, numericId: true, firstName: true, lastName: true },
    });
    results.findUniqueByNumeric = findByNumeric;
  } catch (e: any) {
    results.findUniqueByNumericError = e.message;
  }

  // Total users with numericId set
  try {
    const cnt = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint as count FROM "User" WHERE "numericId" IS NOT NULL`;
    results.totalUsersWithNumericId = Number(cnt[0]?.count || 0);
  } catch (e: any) {
    results.countError = e.message;
  }

  return NextResponse.json(results);
}
