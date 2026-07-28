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
  const usePrefix = url.searchParams.get('prefix') !== '0';
  const customPrefix = url.searchParams.get('customPrefix');

  const prefixesToTry = customPrefix 
    ? [customPrefix]
    : usePrefix 
      ? [
          `teacher-library/${teacherId}/`,
          `teacher-library/${teacherId}`,
        ]
      : [''];

  const result: any = { prefixes: prefixesToTry, results: {} };

  for (const prefix of prefixesToTry) {
    const all: any[] = [];
    let cursor: string | undefined;
    try {
      do {
        const res: any = await list({
          prefix: prefix || undefined,
          cursor,
          limit: 1000,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        for (const b of res.blobs) {
          all.push({
            key: b.pathname,
            url: b.url,
            size: b.size,
          });
        }
        cursor = res.cursor;
      } while (cursor);
      result.results[prefix || '(no prefix)'] = { count: all.length, files: all.slice(0, 50) };
    } catch (err: any) {
      result.results[prefix || '(no prefix)'] = { error: err?.message };
    }
  }

  return NextResponse.json(result);
}