import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min for Pro plan

const prisma = new PrismaClient();

// Public Google Translate endpoint (free, no key, used by translate.google.com)
async function translateBatch(texts: string[]): Promise<string[]> {
  if (texts.length === 0) return [];
  const q = texts.join('\n');
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=ar&dt=t&q=${encodeURIComponent(q)}`;
  
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  
  if (!res.ok) {
    throw new Error(`Google Translate returned ${res.status}`);
  }
  
  const result = await res.json();
  // Result format: [[[translation, original, ...], ...], null, ...]
  const translations: string[] = [];
  for (const item of result[0]) {
    if (item[0]) translations.push(item[0]);
  }
  
  // If count mismatch, fall back to per-item translation
  if (translations.length !== texts.length) {
    console.warn(`Translation count mismatch: ${translations.length} vs ${texts.length}, falling back to per-item`);
    const fallback: string[] = [];
    for (const t of texts) {
      const r = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=ar&dt=t&q=${encodeURIComponent(t)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const d = await r.json();
      fallback.push(d[0]?.[0]?.[0] || t);
      await new Promise(r => setTimeout(r, 50));
    }
    return fallback;
  }
  
  return translations;
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const dryRun = searchParams.get('dry') === '1';

  if (token !== process.env.SEED_TOKEN && authHeader !== `Bearer ${process.env.SEED_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const stats = {
    firstName: { translated: 0, skipped: 0, errors: 0 },
    lastName: { translated: 0, skipped: 0, errors: 0 },
    total: 0,
    duration: 0,
  };

  try {
    // 1. Get profs missing AR (FR→AR translation needed)
    const profs = await prisma.user.findMany({
      where: {
        role: 'TEACHER',
        email: { not: 'boutiti.mehdi@gmail.com' },
        OR: [
          { firstNameAr: null },
          { firstNameAr: '' },
          { lastNameAr: null },
          { lastNameAr: '' },
        ],
      },
      select: {
        id: true,
        numericId: true,
        firstName: true,
        lastName: true,
        firstNameAr: true,
        lastNameAr: true,
      },
    });

    console.log(`Found ${profs.length} profs needing AR translation`);
    stats.total = profs.length;

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        wouldTranslate: profs.length,
        sample: profs.slice(0, 10),
      });
    }

    // 2. Process in batches of 50 names per Google call
    const BATCH_SIZE = 50;
    const BATCH_DELAY = 100; // ms between batches

    // Separate firstName and lastName
    const firstNameJobs: { id: number; text: string }[] = [];
    const lastNameJobs: { id: number; text: string }[] = [];

    for (const p of profs) {
      if (p.firstName && (!p.firstNameAr || p.firstNameAr === '')) {
        firstNameJobs.push({ id: p.id, text: p.firstName });
      }
      if (p.lastName && (!p.lastNameAr || p.lastNameAr === '')) {
        lastNameJobs.push({ id: p.id, text: p.lastName });
      }
    }

    console.log(`firstName jobs: ${firstNameJobs.length}, lastName jobs: ${lastNameJobs.length}`);

    // 3. Translate firstName
    for (let i = 0; i < firstNameJobs.length; i += BATCH_SIZE) {
      const batch = firstNameJobs.slice(i, i + BATCH_SIZE);
      try {
        const texts = batch.map(b => b.text);
        const translations = await translateBatch(texts);
        
        for (let j = 0; j < batch.length; j++) {
          if (translations[j]) {
            await prisma.user.update({
              where: { id: batch[j].id },
              data: { firstNameAr: translations[j] },
            });
            stats.firstName.translated++;
          } else {
            stats.firstName.skipped++;
          }
        }
      } catch (e: any) {
        console.error(`firstName batch ${i} error:`, e.message);
        stats.firstName.errors += batch.length;
      }
      await sleep(BATCH_DELAY);
    }

    // 4. Translate lastName
    for (let i = 0; i < lastNameJobs.length; i += BATCH_SIZE) {
      const batch = lastNameJobs.slice(i, i + BATCH_SIZE);
      try {
        const texts = batch.map(b => b.text);
        const translations = await translateBatch(texts);
        
        for (let j = 0; j < batch.length; j++) {
          if (translations[j]) {
            await prisma.user.update({
              where: { id: batch[j].id },
              data: { lastNameAr: translations[j] },
            });
            stats.lastName.translated++;
          } else {
            stats.lastName.skipped++;
          }
        }
      } catch (e: any) {
        console.error(`lastName batch ${i} error:`, e.message);
        stats.lastName.errors += batch.length;
      }
      await sleep(BATCH_DELAY);
    }

    stats.duration = Math.round((Date.now() - startTime) / 1000);

    return NextResponse.json({
      success: true,
      stats,
      message: `Translated ${stats.firstName.translated} firstName + ${stats.lastName.translated} lastName in ${stats.duration}s`,
    });
  } catch (e: any) {
    console.error('Fatal error:', e);
    return NextResponse.json(
      { error: e.message, stats },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
