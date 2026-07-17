import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const r: any = { timestamp: new Date().toISOString() };
  try {
    const u = await prisma.user.findUnique({
      where: { numericId: 953 },
      select: { id: true, numericId: true, firstName: true, lastName: true },
    });
    r.byPrisma = u;
  } catch (e: any) {
    r.byPrismaError = e.message;
  }
  try {
    const raw = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT id, "numericId", "firstName" FROM "User" WHERE "numericId" = 953 LIMIT 1`
    );
    r.byRaw = raw;
  } catch (e: any) {
    r.byRawError = e.message;
  }
  return NextResponse.json(r);
}
