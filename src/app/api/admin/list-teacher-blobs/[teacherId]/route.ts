import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const { teacherId } = await params;
  const url = new URL(req.url);
  const search = url.searchParams.get('search') || '';

  const all: any[] = [];
  let cursor: string | undefined;
  try {
    do {
      const res: any = await list({
        cursor,
        limit: 1000,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      for (const b of res.blobs) {
        all.push({ key: b.pathname, url: b.url, size: b.size });
      }
      cursor = res.cursor;
    } while (cursor);

    // Filter
    let filtered = all;
    if (teacherId) {
      filtered = filtered.filter((f: any) => f.key.includes(teacherId));
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((f: any) => f.key.toLowerCase().includes(s));
    }

    return NextResponse.json({
      total: all.length,
      filteredCount: filtered.length,
      teacherIdMatches: filtered.filter((f: any) => f.key.includes(teacherId)).length,
      results: filtered.slice(0, 100),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message, stack: err?.stack }, { status: 500 });
  }
}