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
    // Resources that came from Jotform with their submission IDs
    const stats = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) FILTER (WHERE status = 'PUBLISHED') as total_pub,
        COUNT(*) FILTER (WHERE status = 'PUBLISHED' AND "originalSubmissionId" IS NOT NULL AND "originalSubmissionId" != '') as with_jotform_id,
        COUNT(*) FILTER (WHERE status = 'PUBLISHED' AND "importedFrom" = 'jotform') as imported_from_jotform,
        COUNT(*) FILTER (WHERE status = 'PUBLISHED' AND "importedFrom" IS NOT NULL) as any_imported
      FROM "Resource"
    `;

    // Sample of jotform-imported resources
    const samples = await prisma.$queryRaw<any[]>`
      SELECT
        "numericId", "originalSubmissionId", "originalFileName",
        "homeworkSubtype", "homeworkNumber", "year",
        title, type
      FROM "Resource"
      WHERE status = 'PUBLISHED'
        AND "originalSubmissionId" IS NOT NULL
        AND "originalSubmissionId" != ''
      ORDER BY "numericId" DESC
      LIMIT 10
    `;

    // Resources in ResourceTitleBackup that came from Jotform
    const backupWithJotform = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count
      FROM "ResourceTitleBackup" b
      WHERE b."oldTitle" LIKE '%.pdf' OR b."oldTitle" LIKE '%.docx%'
    `;

    return NextResponse.json({
      stats: {
        total_published: safeNum(stats[0]?.total_pub),
        with_jotform_submission_id: safeNum(stats[0]?.with_jotform_id),
        imported_from_jotform: safeNum(stats[0]?.imported_from_jotform),
        any_imported: safeNum(stats[0]?.any_imported),
      },
      samples: samples.map(s => ({
        id: safeNum(s.numericId),
        jotform_id: s.originalSubmissionId,
        filename: s.originalFileName,
        subtype: s.homeworkSubtype,
        number: s.homeworkNumber,
        year: s.year,
        title: s.title?.substring(0, 60),
        type: s.type,
      })),
      backup_with_filename: safeNum(backupWithJotform[0]?.count),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
