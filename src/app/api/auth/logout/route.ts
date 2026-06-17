import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';
import { getRequestOrigin } from '@/lib/origin';

export async function POST(req: NextRequest) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL('/', getRequestOrigin(req)));
}
