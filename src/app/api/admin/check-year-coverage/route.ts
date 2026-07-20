import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const maxDuration = 30;

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check year coverage
    const yearStats = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) as total_pub,
        COUNT(*) FILTER (WHERE "year" IS NOT NULL AND "year" != '') as with_year,
        COUNT(*) FILTER (WHERE "year" IS NULL OR "year" = '') as without_year,
        COUNT(*) FILTER (WHERE "headerData" IS NOT NULL) as with_header,
        COUNT(*) FILTER (WHERE "schoolName" IS NOT NULL AND "schoolName" != '') as with_school
      FROM "Resource"
      WHERE status = 'PUBLISHED'
    `;

    // Sample of years
    const yearSamples = await prisma.$queryRaw<any[]>`
      SELECT "year", COUNT(*) as count
      FROM "Resource"
      WHERE status = 'PUBLISHED' AND "year" IS NOT NULL AND "year" != ''
      GROUP BY "year"
      ORDER BY count DESC
      LIMIT 20
    `;

    // Sample of titles that have no year in title but year in DB
    const regenCandidates = await prisma.$queryRaw<any[]>`
      SELECT
        r.id, r."numericId", r.title, r.type, r.year,
        c."nameFr" as class_name, s."nameFr" as subject_name,
        sec."nameFr" as section_name
      FROM "Resource" r
      LEFT JOIN "Class" c ON r."classId" = c.id
      LEFT JOIN "Subject" s ON r."subjectId" = s.id
      LEFT JOIN "Section" sec ON r."sectionId" = sec.id
      WHERE r.status = 'PUBLISHED'
        AND r.year IS NOT NULL AND r.year != ''
        AND (r.title !~ '20[0-2][0-9]' OR r.title ~ '\.pdf$|\.docx?$|\.doc|\.jpg$|\.png$')
      ORDER BY r."numericId" DESC
      LIMIT 30
    `;

    // Count of "regen-able" resources
    const regenableCount = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count
      FROM "Resource" r
      WHERE r.status = 'PUBLISHED'
        AND r.year IS NOT NULL AND r.year != ''
        AND r."subjectId" IS NOT NULL
        AND (
          r.title ~ '\.pdf$|\.docx?$|\.doc$|\.jpg$|\.png$' OR
          r.title LIKE '%(devoirat.net)%' OR
          r.title LIKE '%(tunisiecollege.net)%' OR
          r.title ~ '^(dc|devoir|devoirat|taki)'
        )
    `;

    // Convert BigInts to Numbers
    const safeNum = (v: any) => typeof v === 'bigint' ? Number(v) : v;

    return NextResponse.json({
      coverage: {
        total_pub: safeNum(yearStats[0]?.total_pub),
        with_year: safeNum(yearStats[0]?.with_year),
        without_year: safeNum(yearStats[0]?.without_year),
        with_header: safeNum(yearStats[0]?.with_header),
        with_school: safeNum(yearStats[0]?.with_school),
      },
      year_distribution: yearSamples.map(y => ({
        year: y.year,
        count: safeNum(y.count),
      })),
      regen_candidates: { count: safeNum(regenableCount[0]?.count) },
      sample_titles: regenCandidates.map(r => ({
        id: safeNum(r.numericId),
        old_title: r.title,
        type: r.type,
        year: r.year,
        class: r.class_name,
        subject: r.subject_name,
        section: r.section_name,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
