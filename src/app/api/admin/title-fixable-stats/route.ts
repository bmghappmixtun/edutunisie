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
    // Total resources by status
    const total = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'PUBLISHED') as pub
      FROM "Resource"
    `;

    // Resources we CAN regenerate (have all needed metadata)
    const canRegenerate = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) as can_do,
        COUNT(*) FILTER (WHERE "year" IS NOT NULL AND "year" != '') as have_year,
        COUNT(*) FILTER (WHERE "classId" IS NOT NULL) as have_class,
        COUNT(*) FILTER (WHERE "subjectId" IS NOT NULL) as have_subject,
        COUNT(*) FILTER (WHERE "type" IS NOT NULL AND "type" != '') as have_type
      FROM "Resource"
      WHERE status = 'PUBLISHED'
    `;

    // Resources we SHOULD regenerate (bad title patterns)
    const shouldFix = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) as need_fix,
        COUNT(*) FILTER (WHERE title ~ '\.pdf$|\.docx?$|\.doc$|\.jpg$|\.png$|\.jpeg$') as has_ext,
        COUNT(*) FILTER (WHERE title ~* '(devoirat\.net|tunisiecollege|google drive|taki academy|examanet)') as has_watermark,
        COUNT(*) FILTER (WHERE title IS NULL OR TRIM(title) = '') as empty,
        COUNT(*) FILTER (WHERE LENGTH(title) < 8) as too_short,
        COUNT(*) FILTER (WHERE LENGTH(title) > 150) as too_long,
        COUNT(*) FILTER (WHERE title ~ '^[a-z0-9\.\-_]{1,10}$') as gibberish_code,
        COUNT(*) FILTER (WHERE title !~ '20[0-2][0-9]') as no_year_in_title,
        COUNT(*) FILTER (WHERE title !~* 'devoir|examen|test|révision|série|cours|exercice') as no_type_in_title,
        COUNT(*) FILTER (WHERE title !~* '7e|8e|9e|1e|2e|3e|4e|bac|collège|lycée|7eme|8eme|9eme|1ere|2eme|3eme|4eme') as no_class_in_title
      FROM "Resource"
      WHERE status = 'PUBLISHED'
    `;

    // Intersection: bad title AND have all metadata (these are auto-fixable)
    const fixable = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count
      FROM "Resource"
      WHERE status = 'PUBLISHED'
        AND "classId" IS NOT NULL
        AND "subjectId" IS NOT NULL
        AND "type" IS NOT NULL AND "type" != ''
        AND (
          title ~ '\.pdf$|\.docx?$|\.doc$|\.jpg$|\.png$|\.jpeg$'
          OR title ~* '(devoirat\.net|tunisiecollege|google drive|taki academy|examanet)'
          OR title IS NULL OR TRIM(title) = ''
          OR LENGTH(title) < 8
          OR title ~ '^[a-z0-9\.\-_]{1,10}$'
        )
    `;

    // Of these fixable, how many have year?
    const fixableWithYear = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) as total_fixable,
        COUNT(*) FILTER (WHERE "year" IS NOT NULL AND "year" != '') as with_year,
        COUNT(*) FILTER (WHERE "year" IS NULL OR "year" = '') as without_year
      FROM "Resource"
      WHERE status = 'PUBLISHED'
        AND "classId" IS NOT NULL
        AND "subjectId" IS NOT NULL
        AND "type" IS NOT NULL AND "type" != ''
        AND (
          title ~ '\.pdf$|\.docx?$|\.doc$|\.jpg$|\.png$|\.jpeg$'
          OR title ~* '(devoirat\.net|tunisiecollege|google drive|taki academy|examanet)'
          OR title IS NULL OR TRIM(title) = ''
          OR LENGTH(title) < 8
          OR title ~ '^[a-z0-9\.\-_]{1,10}$'
        )
    `;

    // Of those without year, can we fall back to createdAt?
    const fallbackYear = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) as total_no_year,
        COUNT(*) FILTER (WHERE "createdAt" >= '2010-01-01') as has_recent_created
      FROM "Resource"
      WHERE status = 'PUBLISHED'
        AND "classId" IS NOT NULL
        AND "subjectId" IS NOT NULL
        AND "type" IS NOT NULL AND "type" != ''
        AND (year IS NULL OR year = '')
    `;

    return NextResponse.json({
      overview: {
        total_resources: safeNum(total[0]?.total),
        published: safeNum(total[0]?.pub),
      },
      can_regenerate: {
        have_all_metadata: safeNum(canRegenerate[0]?.can_do),
        with_year: safeNum(canRegenerate[0]?.have_year),
        with_class: safeNum(canRegenerate[0]?.have_class),
        with_subject: safeNum(canRegenerate[0]?.have_subject),
        with_type: safeNum(canRegenerate[0]?.have_type),
        pct: ((safeNum(canRegenerate[0]?.can_do) / safeNum(total[0]?.pub)) * 100).toFixed(1) + '%',
      },
      should_fix: {
        total_need_fix: safeNum(shouldFix[0]?.need_fix),
        has_file_extension: safeNum(shouldFix[0]?.has_ext),
        has_watermark: safeNum(shouldFix[0]?.has_watermark),
        empty: safeNum(shouldFix[0]?.empty),
        too_short_lt_8: safeNum(shouldFix[0]?.too_short),
        too_long_gt_150: safeNum(shouldFix[0]?.too_long),
        gibberish_code: safeNum(shouldFix[0]?.gibberish_code),
        no_year_in_title: safeNum(shouldFix[0]?.no_year_in_title),
        no_type_in_title: safeNum(shouldFix[0]?.no_type_in_title),
        no_class_in_title: safeNum(shouldFix[0]?.no_class_in_title),
      },
      fixable: {
        bad_title_AND_have_metadata: safeNum(fixable[0]?.count),
        total_fixable: safeNum(fixableWithYear[0]?.total_fixable),
        with_year: safeNum(fixableWithYear[0]?.with_year),
        without_year: safeNum(fixableWithYear[0]?.without_year),
        without_year_but_recent_created: safeNum(fallbackYear[0]?.has_recent_created),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
