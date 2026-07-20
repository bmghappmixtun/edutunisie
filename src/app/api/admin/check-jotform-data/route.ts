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
    // Check what Jotform-related fields we have
    const overview = await prisma.$queryRaw<any[]>`
      SELECT
        (SELECT COUNT(*) FROM "Resource" WHERE status = 'PUBLISHED') as total,
        (SELECT COUNT(*) FROM "Resource" WHERE "originalFileName" IS NOT NULL AND "originalFileName" != '') as has_original_name,
        (SELECT COUNT(*) FROM "Resource" WHERE "originalFileKey" IS NOT NULL AND "originalFileKey" != '') as has_original_key,
        (SELECT COUNT(*) FROM "Resource" WHERE "originalFormat" IS NOT NULL) as has_format,
        (SELECT COUNT(*) FROM "Resource" WHERE "homeworkSubtype" IS NOT NULL) as has_subtype,
        (SELECT COUNT(*) FROM "Resource" WHERE "homeworkNumber" IS NOT NULL) as has_number,
        (SELECT COUNT(*) FROM "Resource" WHERE "year" IS NOT NULL AND "year" != '') as has_year
    `;

    // Sample of originalFileName to see patterns
    const samples = await prisma.$queryRaw<any[]>`
      SELECT
        "originalFileName",
        "homeworkSubtype",
        "homeworkNumber",
        "year",
        title
      FROM "Resource"
      WHERE status = 'PUBLISHED'
        AND "originalFileName" IS NOT NULL
        AND "originalFileName" != ''
      ORDER BY "numericId" DESC
      LIMIT 15
    `;

    // Check jotform migration route to understand the import flow
    const migrations = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM "Resource"
      WHERE status = 'PUBLISHED'
        AND (
          "originalFileName" LIKE '%jotform%' OR
          "originalFileName" LIKE '%.pdf' OR
          title ~ 'Jotform'
        )
    `;

    return NextResponse.json({
      overview: {
        total: safeNum(overview[0]?.total),
        has_original_name: safeNum(overview[0]?.has_original_name),
        has_original_key: safeNum(overview[0]?.has_original_key),
        has_format: safeNum(overview[0]?.has_format),
        has_subtype: safeNum(overview[0]?.has_subtype),
        has_number: safeNum(overview[0]?.has_number),
        has_year: safeNum(overview[0]?.has_year),
      },
      missing_attributes: {
        without_subtype: safeNum(overview[0]?.total) - safeNum(overview[0]?.has_subtype),
        without_number: safeNum(overview[0]?.total) - safeNum(overview[0]?.has_number),
        without_year: safeNum(overview[0]?.total) - safeNum(overview[0]?.has_year),
      },
      sample_original_names: samples.map(s => ({
        original: s.originalFileName,
        title: s.title?.substring(0, 60),
        subtype: s.homeworkSubtype,
        number: s.homeworkNumber,
        year: s.year,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
