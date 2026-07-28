import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

/**
 * TEMPORARY endpoint: list all blob files for a teacher.
 * Used to recover fileKeys for a teacher whose DB records were deleted.
 *
 * DELETE THIS ROUTE AFTER USE.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  // Simple protection: only allow specific teacherIds we know about
  const { teacherId } = await params;
  const ALLOWED = ['cmqy1wyi0001f3ajzixt1hw84'];
  if (!ALLOWED.includes(teacherId)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  const prefix = `teacher-library/${teacherId}/`;
  const all: Array<{ key: string; url: string; size: number; uploadedAt: Date }> = [];
  let cursor: string | undefined;

  try {
    do {
      const res: any = await list({
        prefix,
        cursor,
        limit: 1000,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      for (const b of res.blobs) {
        all.push({
          key: b.pathname,
          url: b.url,
          size: b.size,
          uploadedAt: b.uploadedAt,
        });
      }
      cursor = res.cursor;
    } while (cursor);

    return NextResponse.json({ count: all.length, files: all });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'list_failed', message: err?.message, stack: err?.stack },
      { status: 500 }
    );
  }
}
