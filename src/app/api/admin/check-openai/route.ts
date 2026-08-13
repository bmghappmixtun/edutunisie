import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ||
                req.nextUrl.searchParams.get('token');
  if (token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    OPENAI_API_KEY_exists: !!process.env.OPENAI_API_KEY,
    OPENAI_API_KEY_length: (process.env.OPENAI_API_KEY || '').length,
    OPENAI_API_KEY_prefix: (process.env.OPENAI_API_KEY || '').substring(0, 10),
    OPENAI_ADMIN_KEY_exists: !!process.env.OPENAI_ADMIN_KEY,
  });
}
