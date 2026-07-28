import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const { teacherId } = await params;
  const url = new URL(req.url);
  const search = (url.searchParams.get('search') || '').toLowerCase();
  const teacherFilter = url.searchParams.get('teacherId') || teacherId;
  const limit = parseInt(url.searchParams.get('limit') || '50');

  const matches: any[] = [];
  let scanned = 0;
  let cursor: string | undefined;
  try {
    do {
      const res: any = await list({
        cursor,
        limit: 1000,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      for (const b of res.blobs) {
        scanned++;
        const keyLower = b.pathname.toLowerCase();
        const teacherMatch = teacherFilter ? keyLower.includes(teacherFilter.toLowerCase()) : true;
        const searchMatch = search ? keyLower.includes(search) : true;
        if (teacherMatch && searchMatch) {
          matches.push({ key: b.pathname, url: b.url, size: b.size });
          if (matches.length >= limit) break;
        }
      }
      cursor = res.cursor;
      if (matches.length >= limit) break;
    } while (cursor);

    return NextResponse.json({
      scanned,
      matches: matches.length,
      results: matches,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message, stack: err?.stack }, { status: 500 });
  }
}