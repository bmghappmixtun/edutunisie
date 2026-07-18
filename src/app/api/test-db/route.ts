import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const count = await prisma.resource.count();
    return NextResponse.json({ ok: true, resourceCount: count });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message, code: err?.code },
      { status: 500 }
    );
  }
}
