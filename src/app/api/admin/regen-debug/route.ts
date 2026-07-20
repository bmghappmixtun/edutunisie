import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const maxDuration = 30;

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const test = searchParams.get('test');

  if (token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Run the exact SQL from regen-titles and count
    const allBadPattern = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count
      FROM "Resource" r
      WHERE r.status = 'PUBLISHED'
        AND r."classId" IS NOT NULL
        AND r."subjectId" IS NOT NULL
        AND r.type IS NOT NULL AND r.type != ''
        AND (
          r.title ~ '\.pdf$|\.docx?$|\.doc$|\.jpg$|\.png$|\.jpeg$'
          OR r.title ~* '(devoirat\.net|tunisiecollege|google drive|taki academy|examanet)'
          OR r.title IS NULL OR TRIM(r.title) = ''
          OR LENGTH(r.title) < 8
          OR r.title ~ '^[a-z0-9\.\-_]{1,10}$'
        )
    `;

    const afterFilter = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count
      FROM "Resource" r
      WHERE r.status = 'PUBLISHED'
        AND r."classId" IS NOT NULL
        AND r."subjectId" IS NOT NULL
        AND r.type IS NOT NULL AND r.type != ''
        AND (
          r.title ~ '\.pdf$|\.docx?$|\.doc$|\.jpg$|\.png$|\.jpeg$'
          OR r.title ~* '(devoirat\.net|tunisiecollege|google drive|taki academy|examanet)'
          OR r.title IS NULL OR TRIM(r.title) = ''
          OR LENGTH(r.title) < 8
          OR r.title ~ '^[a-z0-9\.\-_]{1,10}$'
        )
        AND (
          r.title !~* 'devoir|examen|test|révision|série|cours|exercice|concours|bac|revision|serie'
          OR r.title !~* 'math|maths|mathématique|physique|svt|sciences|arabe|fran[cç]ais|anglais|philo|philosophie|hist|histoire|geo|géo|informatique|techno|technologie|gestion|économie|eco|sport|musiq|islami|tajwid|tarbia|algorithme|allemand|italien|espagnol'
          OR (
            r.title !~* '(7|8|9|1|2|3|4)[èe]me'
            AND r.title !~* '(7|8|9|1|2|3|4)(ere|ère|eme|ème)'
            AND r.title !~* '(7e|8e|9e|1e|2e|3e|4e)'
            AND r.title !~* '(7ere|7ème|8eme|9ème|1ere|2eme|3eme|4eme)'
            AND r.title !~* 'bac|coll[èe]ge|lyc[éè]e|primaire|secondaire|ann[ée]e'
          )
        )
    `;

    // Test specific title
    const testResult = await prisma.$queryRaw<any[]>`
      SELECT
        'Devoir de Synthèse N°3 Corrigé -Physique - 7ème (2025-2026) Taki Academy-stamped' ~ '\.pdf$' as has_pdf,
        'Devoir de Synthèse N°3 Corrigé -Physique - 7ème (2025-2026) Taki Academy-stamped' ~* 'taki academy' as has_taki,
        'Devoir de Synthèse N°3 Corrigé -Physique - 7ème (2025-2026) Taki Academy-stamped' !~* 'devoir|...' as missing_type,
        'Devoir de Synthèse N°3 Corrigé -Physique - 7ème (2025-2026) Taki Academy-stamped' !~* 'math|physique|...' as missing_subject,
        'Devoir de Synthèse N°3 Corrigé -Physique - 7ème (2025-2026) Taki Academy-stamped' !~* '(7|8|9|1|2|3|4)[èe]me' as missing_class1,
        'Devoir de Synthèse N°3 Corrigé -Physique - 7ème (2025-2026) Taki Academy-stamped' !~* 'bac|coll[èe]ge|lyc[éè]e|primaire|secondaire|ann[ée]e' as missing_class2
    `;

    return NextResponse.json({
      all_bad_pattern: Number(allBadPattern[0]?.count || 0),
      after_has_all_3_filter: Number(afterFilter[0]?.count || 0),
      test_3002: {
        ...testResult[0],
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
