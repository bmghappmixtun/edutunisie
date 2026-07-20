import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const maxDuration = 30;

const prisma = new PrismaClient();

const safeNum = (v: any) => typeof v === 'bigint' ? Number(v) : v;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resourceSources = await prisma.$queryRaw<any[]>`
      SELECT "importedFrom", COUNT(*) as count
      FROM "Resource"
      WHERE status = 'PUBLISHED'
      GROUP BY "importedFrom"
      ORDER BY count DESC
    `;

    const teacherFileSources = await prisma.$queryRaw<any[]>`
      SELECT "importedFrom", COUNT(*) as count
      FROM "TeacherFile"
      GROUP BY "importedFrom"
      ORDER BY count DESC
    `;

    const submissionPatterns = await prisma.$queryRaw<any[]>`
      SELECT
        SUBSTRING("originalSubmissionId" FROM '^([^_-]+)') as pattern,
        COUNT(*) as count
      FROM "Resource"
      WHERE status = 'PUBLISHED' AND "originalSubmissionId" IS NOT NULL
      GROUP BY pattern
      ORDER BY count DESC
    `;

    // Sample of resource.originalSubmissionId for each pattern
    const sampleByPattern = await prisma.$queryRaw<any[]>`
      SELECT
        "originalSubmissionId",
        "originalFileName",
        title
      FROM "Resource"
      WHERE status = 'PUBLISHED'
        AND "originalSubmissionId" IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 5
    `;

    return NextResponse.json({
      resource_sources: resourceSources.map(r => ({ source: r.importedFrom, count: safeNum(r.count) })),
      teacher_file_sources: teacherFileSources.map(r => ({ source: r.importedFrom, count: safeNum(r.count) })),
      submission_id_patterns: submissionPatterns.map(r => ({ pattern: r.pattern, count: safeNum(r.count) })),
      sample_submissions: sampleByPattern.map(s => ({
        id: s.originalSubmissionId,
        filename: s.originalFileName,
        title: s.title?.slice(0, 60),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
