import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const maxDuration = 120;

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const format = searchParams.get('format') || 'summary'; // summary | full

  if (token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all published resources with their class/subject
    const resources = await prisma.resource.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        numericId: true,
        title: true,
        type: true,
        classId: true,
        subjectId: true,
        class: { select: { nameFr: true, slug: true } },
        subject: { select: { nameFr: true, slug: true } },
      },
    });

    const totalTitles = resources.length;

    // Pattern checks
    const patterns = {
      type: /\b(devoir|examen|test|révision|revision|série|serie|cours|leçon|exercice|bac|concours)\b/i,
      controle_synthese: /\b(contrôle|controle|synth[eè]se)\b/i,
      matiere: /\b(math|maths|mathématiques|mathematiques|physique|svt|sciences?\s+physiques?|arabe|fran[cç]ais|anglais|philo|philosophie|hist|histoire|geo|géographie|informatique|techno|technologie|gestion|économie|eco|sport|musiq|islami|tajwid|tarbia|3inaya|eddirasa)\b/i,
      classe: /\b(7|8|9|[1-4])([eè]me|ère|ere)\b|\b(7e|8e|9e|1e|2e|3e|4e)\b|\b(bac|coll[eè]ge|lyc[eé]e)\b/i,
      section: /\b(sciences?|lettres?|eco|gestion|techno(?:logie)?|info(?:rmatique)?|sport|musiq|si)\b/i,
      annee: /20[0-2][0-9][\s\-\/]+20[0-2][0-9]|\b20[0-2][0-9][\s\-\/]\b/,
      lycee_college: /lyc[eé]e|coll[eè]ge|pilote/i,
    };

    const issues = {
      filename: [] as any[],          // .pdf, .docx, IMG, etc.
      watermark: [] as any[],         // source names, emails
      gibberish: [] as any[],         // random long strings
      no_type: [] as any[],           // no devoir/examen/...
      no_class: [] as any[],          // no 7-9eme, bac mention
      no_year: [] as any[],           // no 20XX year
      no_matiere: [] as any[],        // no subject word
      empty: [] as any[],             // empty title
      very_long: [] as any[],         // > 200 chars
    };

    const samplesByPattern: any = {};

    for (const r of resources) {
      const t = (r.title || '').trim();
      if (!t) {
        issues.empty.push({ id: r.numericId, title: t });
        continue;
      }
      const tl = t.toLowerCase();

      // Filename patterns
      if (/\.(pdf|docx?|xls|xlsx|pptx?|jpg|jpeg|png|gif|webp|zip|rar)\b/i.test(t) ||
          /\bimg[_-]?\d+/i.test(t) ||
          /\b(doc|dsc|scan|dscn)[_-]?\d+/i.test(t) ||
          /\bscan|scanned|scanner\b/i.test(t)) {
        issues.filename.push({ id: r.numericId, title: t });
      }

      // Watermark/source patterns
      if (/tunisiecollege|devoirat\.net|google\s*drive|dropbox|telecharg|examanet\.com/i.test(t) ||
          /[a-z0-9._%+-]+@[a-z0-9.-]+\.(com|fr|net|org)/i.test(t)) {
        issues.watermark.push({ id: r.numericId, title: t });
      }

      // Gibberish (no spaces, all caps random, repeated chars)
      const noSpaceLong = t.replace(/\s/g, '').length;
      if (noSpaceLong > 40 && t.split(' ').length <= 2) {
        issues.gibberish.push({ id: r.numericId, title: t });
      }

      // Missing components
      if (!patterns.type.test(t)) {
        issues.no_type.push({ id: r.numericId, title: t });
      }
      if (!patterns.classe.test(t)) {
        issues.no_class.push({ id: r.numericId, title: t });
      }
      if (!patterns.annee.test(t)) {
        issues.no_year.push({ id: r.numericId, title: t });
      }
      if (!patterns.matiere.test(t) && !r.subject?.nameFr) {
        issues.no_matiere.push({ id: r.numericId, title: t });
      }

      // Very long
      if (t.length > 200) {
        issues.very_long.push({ id: r.numericId, title: t, length: t.length });
      }
    }

    // Aggregate
    const summary = {
      total: totalTitles,
      empty: issues.empty.length,
      filename: issues.filename.length,
      watermark: issues.watermark.length,
      gibberish: issues.gibberish.length,
      no_type: issues.no_type.length,
      no_class: issues.no_class.length,
      no_year: issues.no_year.length,
      no_matiere: issues.no_matiere.length,
      very_long: issues.very_long.length,
    };

    // How many match all main components
    const completeCount = resources.filter(r => {
      const t = r.title || '';
      return t && patterns.type.test(t) && patterns.classe.test(t) && patterns.annee.test(t);
    }).length;

    if (format === 'full') {
      return NextResponse.json({
        summary,
        complete: completeCount,
        complete_pct: ((completeCount / totalTitles) * 100).toFixed(1) + '%',
        issues,
      });
    }

    // Summary with samples
    return NextResponse.json({
      summary,
      complete: completeCount,
      complete_pct: ((completeCount / totalTitles) * 100).toFixed(1) + '%',
      samples: {
        filename: issues.filename.slice(0, 10),
        watermark: issues.watermark.slice(0, 10),
        gibberish: issues.gibberish.slice(0, 10),
        no_type: issues.no_type.slice(0, 10),
        no_class: issues.no_class.slice(0, 10),
        no_year: issues.no_year.slice(0, 10),
        no_matiere: issues.no_matiere.slice(0, 10),
        very_long: issues.very_long.slice(0, 5),
        empty: issues.empty.slice(0, 10),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
