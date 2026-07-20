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
    // Test the regex on specific titles
    const tests = [
      { id: 3002, title: "Devoir de Synthèse N°3 Corrigé -Physique - 7ème (2025-2026) Taki Academy-stamped" },
      { id: 9999, title: "DS1 11" },
      { id: 9998, title: "DC3 3éco 2026.pdf" },
      { id: 9997, title: "Mathématiques Bac Sciences" },
    ];

    const results: any[] = [];
    for (const t of tests) {
      const r = await prisma.$queryRaw<any[]>`
        SELECT
          ${t.title} ~* 'devoir|examen|test|révision|série|cours|exercice|concours' as has_type,
          ${t.title} ~* 'math|maths|mathématique|physique|svt|sciences|arabe' as has_subject,
          ${t.title} ~* '\b(7|8|9|[1-4])\s*(e|è|eme|ème|ere|ère)\b' as has_class1,
          ${t.title} ~* '\b(7e|8e|9e|1ere|2eme|3eme|4eme|bac|coll[eè]ge|lyc[eé]e)\b' as has_class2,
          ${t.title} ~* '7ème' as has_7eme_literal,
          ${t.title} ~* '7[èe]me' as has_7eme_alt
      `;
      results.push({ ...t, ...r[0] });
    }

    // Also count how many would be filtered
    const stats = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) FILTER (WHERE title !~* 'devoir|examen|test|révision|série|cours|exercice|concours') as no_type,
        COUNT(*) FILTER (WHERE title !~* 'math|maths|mathématique|physique|svt|sciences|arabe') as no_subject,
        COUNT(*) FILTER (WHERE title !~* '\b(7|8|9|[1-4])\s*(e|è|eme|ème|ere|ère)\b' AND title !~* '\b(7e|8e|9e|1ere|2eme|3eme|4eme|bac|coll[eè]ge|lyc[eé]e)\b') as no_class,
        COUNT(*) FILTER (WHERE title !~* 'devoir|...' OR title !~* 'math|...' OR title !~* 'class regex') as missing_one
      FROM "Resource"
      WHERE status = 'PUBLISHED'
        AND "classId" IS NOT NULL
        AND "subjectId" IS NOT NULL
        AND (title ~ '\.pdf$' OR LENGTH(title) < 8 OR title ~ '^[a-z0-9\.\-_]{1,10}$')
    `;

    return NextResponse.json({
      test_results: results,
      stats: {
        no_type: Number(stats[0]?.no_type || 0),
        no_subject: Number(stats[0]?.no_subject || 0),
        no_class: Number(stats[0]?.no_class || 0),
        missing_one: Number(stats[0]?.missing_one || 0),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
