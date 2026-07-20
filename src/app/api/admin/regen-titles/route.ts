import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const maxDuration = 300;

const prisma = new PrismaClient();

const safeNum = (v: any) => typeof v === 'bigint' ? Number(v) : v;

// Type → human label + sub-template
function getTypeInfo(type: string, subtype: string | null, number: number | null): { label: string; num: string } {
  if (type === 'HOMEWORK') {
    let sub = 'Devoir';
    if (subtype === 'CONTROL') sub = 'Devoir de Contrôle';
    else if (subtype === 'SYNTHESIS') sub = 'Devoir de Synthèse';
    else if (subtype === 'HOUSEWORK') sub = 'Devoir de Maison';
    const num = number ? ` N°${number}` : '';
    return { label: sub, num };
  }
  if (type === 'EXERCISE') return { label: "Série d'exercices", num: number ? ` N°${number}` : '' };
  if (type === 'COURSE') return { label: 'Cours', num: '' };
  if (type === 'REVISION') return { label: 'Fiche de révision', num: number ? ` N°${number}` : '' };
  if (type === 'EXAM') return { label: 'Examen', num: number ? ` N°${number}` : '' };
  if (type === 'BAC_SUBJECT') return { label: 'Sujet Bac', num: number ? ` N°${number}` : '' };
  if (type === 'CORRECTION') return { label: 'Correction', num: '' };
  if (type === 'SUMMARY') return { label: 'Résumé', num: '' };
  return { label: 'Document', num: '' };
}

// Find the "homework number" from the original title (N°1, n°2, numero 3, etc.)
function extractHomeworkNumber(title: string, type: string): number | null {
  if (type !== 'HOMEWORK' && type !== 'EXERCISE' && type !== 'EXAM' && type !== 'REVISION') return null;
  // Look for patterns like "N°1", "N 2", "numero 3", "no 4", "N° 5"
  const m = title.match(/\b(?:N[°ºo]?\s*|n°\s*|num[eé]ro\s*|no\s*)(\d{1,2})\b/i);
  return m ? parseInt(m[1], 10) : null;
}

function buildTitle(opts: {
  type: string;
  subtype: string | null;
  number: number | null;
  subjectName: string;
  className: string;
  sectionName: string | null;
  year: string;
}): string {
  const ti = getTypeInfo(opts.type, opts.subtype, opts.number);
  const parts: string[] = [ti.label + ti.num];
  parts.push(opts.subjectName);
  if (opts.sectionName) {
    parts.push(`${opts.className} ${opts.sectionName}`);
  } else {
    parts.push(opts.className);
  }
  parts.push(opts.year);
  return parts.join(' - ');
}

interface Candidate {
  id: string;
  numericId: number;
  title: string;
  type: string;
  homeworkSubtype: string | null;
  homeworkNumber: number | null;
  year: string;
  classId: string | null;
  subjectId: string;
  className: string | null;
  subjectName: string;
  sectionName: string | null;
  newTitle: string;
}

async function loadCandidates(): Promise<Candidate[]> {
  // Find resources with bad title patterns AND all metadata
  const resources = await prisma.$queryRaw<any[]>`
    SELECT
      r.id, r."numericId", r.title, r.type, r."homeworkSubtype", r."homeworkNumber", r.year,
      r."classId", r."subjectId",
      c."nameFr" as class_name,
      s."nameFr" as subject_name,
      sec."nameFr" as section_name
    FROM "Resource" r
    LEFT JOIN "Class" c ON r."classId" = c.id
    LEFT JOIN "Subject" s ON r."subjectId" = s.id
    LEFT JOIN "Section" sec ON r."sectionId" = sec.id
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
      -- Only touch titles that are MISSING at least one of: type, subject, or class in text
      AND (
        -- Missing a recognizable TYPE word
        r.title !~* 'devoir|examen|test|révision|série|cours|exercice|concours|\bbac\b'
        -- Missing a recognizable SUBJECT word
        OR r.title !~* 'math|maths|mathématique|physique|svt|sciences|arabe|fran[cç]ais|anglais|philo|philosophie|hist|histoire|geo|géo|informatique|techno|technologie|gestion|économie|eco|sport|musiq|islami|tajwid|tarbia'
        -- Missing a recognizable CLASS/LEVEL word
        OR r.title !~* '\b(7|8|9|[1-4])\s*(e|è|eme|ème|ere|ère)\b|\b(7e|8e|9e|1e|2e|3e|4e)\b|\b(7e|8e|9e|1ere|2eme|3eme|4eme|bac|coll[eè]ge|lyc[eé]e)\b'
      )
    ORDER BY r."numericId" ASC
  `;

  return resources.map((r: any) => {
    const number = r.homeworkNumber || extractHomeworkNumber(r.title, r.type);
    const year = r.year || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1);
    const newTitle = buildTitle({
      type: r.type,
      subtype: r.homeworkSubtype,
      number,
      subjectName: r.subject_name,
      className: r.class_name,
      sectionName: r.section_name,
      year,
    });
    return {
      id: r.id,
      numericId: safeNum(r.numericId),
      title: r.title,
      type: r.type,
      homeworkSubtype: r.homeworkSubtype,
      homeworkNumber: r.homeworkNumber,
      year: r.year,
      classId: r.classId,
      subjectId: r.subjectId,
      className: r.class_name,
      subjectName: r.subject_name,
      sectionName: r.section_name,
      newTitle,
    };
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const mode = searchParams.get('mode') || 'dry'; // 'dry' or 'apply'

  if (token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const candidates = await loadCandidates();

    // Check which ones already have a backup (idempotency)
    const existingBackups = await prisma.$queryRaw<any[]>`
      SELECT "resourceId" FROM "ResourceTitleBackup"
    `;
    const alreadyBackedUp = new Set(existingBackups.map((b: any) => b.resourceId));
    const toProcess = candidates.filter(c => !alreadyBackedUp.has(c.id));

    if (mode === 'dry') {
      return NextResponse.json({
        mode: 'dry',
        total_candidates: candidates.length,
        already_backed_up: alreadyBackedUp.size,
        to_process: toProcess.length,
        sample: toProcess.slice(0, 30).map(c => ({
          id: c.numericId,
          old: c.title,
          new: c.newTitle,
          type: c.type,
          year: c.year,
          class: c.className,
          subject: c.subjectName,
        })),
        type_distribution: candidates.reduce((acc: any, c) => {
          acc[c.type] = (acc[c.type] || 0) + 1;
          return acc;
        }, {}),
      });
    }

    // APPLY mode
    if (toProcess.length === 0) {
      return NextResponse.json({
        mode: 'apply',
        message: 'Nothing to process - all candidates already backed up',
        total_candidates: candidates.length,
        already_done: alreadyBackedUp.size,
      });
    }

    let processed = 0;
    let errors = 0;
    const errorLog: any[] = [];

    for (const c of toProcess) {
      try {
        // 1. Backup old title
        await prisma.$executeRaw`
          INSERT INTO "ResourceTitleBackup" ("resourceId", "numericId", "oldTitle", "newTitle")
          VALUES (${c.id}, ${c.numericId}, ${c.title}, ${c.newTitle})
          ON CONFLICT ("resourceId") DO NOTHING
        `;
        // 2. Update title
        await prisma.$executeRaw`
          UPDATE "Resource" SET title = ${c.newTitle}, "updatedAt" = NOW()
          WHERE id = ${c.id}
        `;
        processed++;
      } catch (e: any) {
        errors++;
        errorLog.push({ id: c.numericId, error: e.message });
      }
    }

    return NextResponse.json({
      mode: 'apply',
      processed,
      errors,
      total_candidates: candidates.length,
      sample_errors: errorLog.slice(0, 10),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
