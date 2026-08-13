import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import OpenAI from 'openai';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const TEACHER_ID = 'cmr8vw9in02lfq4p04h5jlxmn';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Tu es un expert en TECHNOLOGIE du système éducatif tunisien (lycée, Génie Mécanique / Génie Électrique).

À partir d'un titre de devoir ou de cours de Technologie, tu dois générer les éléments pédagogiques suivants en FRANÇAIS:

1. **3 SHORT key points** (shortKeyPoints): concepts clés très courts, 2-3 mots maximum chacun (ex: "Bague de friction", "Circuit hydraulique", "Moteur asynchrone"). Ce sont des TERMES techniques, pas des phrases.

2. **3 LONG key points** (keyPoints): phrases complètes de 4-6 mots chacune (ex: "Le vérin pneumatique convertit l'énergie en mouvement", "Le moteur asynchrone tourne à vitesse variable"). Ce sont des CONCEPTS résumés, pas des descriptions complètes.

3. **9 tags** (topics): 1 mot chacun, en minuscule, qui catégorisent le sujet. Ce sont des mots-clés sémantiques comme: pneumatique, hydraulique, électrique, mécanique, capteurs, vérin, moteur, gear, rouage, etc.

RÈGLES IMPORTANTES:
- TOUT en FRANÇAIS uniquement
- Pas d'arabe, pas d'anglais
- Les SHORT KP sont des TERMES techniques (noun phrases, pas des phrases complètes)
- Les LONG KP sont des PHRASES courtes et résumées
- Les TAGS sont 1 mot chacun (catégorie technique)
- Le nombre est STRICT: 3 short + 3 long + 9 tags

FORMAT DE RÉPONSE (JSON strict):
{
  "shortKeyPoints": ["Terme 1", "Terme 2", "Terme 3"],
  "keyPoints": ["Phrase 1", "Phrase 2", "Phrase 3"],
  "topics": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9"]
}`;

interface FileToProcess {
  numericId: number;
  title: string;
  subject: string;
  className: string;
}

async function extractKPForFile(file: FileToProcess): Promise<{
  shortKeyPoints: string[];
  keyPoints: string[];
  topics: string[];
}> {
  const userPrompt = `Sujet: ${file.title}
Matière: Technologie
Classe: ${file.className}

Génère les 3 shortKeyPoints (termes 2-3 mots), 3 keyPoints (phrases 4-6 mots), et 9 topics (1 mot) en français.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 600,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('Empty response from OpenAI');
  const parsed = JSON.parse(content);

  // Validate
  const shortKeyPoints = Array.isArray(parsed.shortKeyPoints) ? parsed.shortKeyPoints.filter(s => typeof s === 'string' && s.trim().length > 0) : [];
  const keyPoints = Array.isArray(parsed.keyPoints) ? parsed.keyPoints.filter(s => typeof s === 'string' && s.trim().length > 0) : [];
  const topics = Array.isArray(parsed.topics) ? parsed.topics.filter(s => typeof s === 'string' && s.trim().length > 0) : [];

  return { shortKeyPoints, keyPoints, topics };
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ||
                req.nextUrl.searchParams.get('token');
  if (token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 5;
    const startIndex = body.startIndex || 0;
    const dryRun = body.dryRun === true;

    // Find all Technologie lycée files with AR keyPoints (or empty keyPoints)
    const allFiles = await prisma.resource.findMany({
      where: {
        class: { level: { slug: 'lycee' } },
        subject: { slug: 'technologie' },
        status: 'PUBLISHED',
      },
      include: { metadata: true, class: true },
      orderBy: { numericId: 'asc' },
    });

    const isArabic = (s: string) => /[\u0600-\u06FF]/.test(s);

    // Filter: only files with AR keyPoints (the buggy 361)
    const buggyFiles = allFiles.filter(f => {
      if (!f.metadata || !f.metadata.keyPoints || f.metadata.keyPoints.length === 0) return false;
      // Has only AR keyPoints (the buggy case)
      const hasArKP = f.metadata.keyPoints.some(k => isArabic(k));
      return hasArKP;
    });

    const totalBuggy = buggyFiles.length;
    const batch = buggyFiles.slice(startIndex, startIndex + batchSize);

    console.log(`Regen KP: total ${totalBuggy} files, processing ${batch.length} from index ${startIndex}`);

    const results: any[] = [];
    for (const f of batch) {
      try {
        const subject = f.metadata?.generalSubject || f.metadata?.systemName || f.title;
        const file: FileToProcess = {
          numericId: f.numericId,
          title: f.title,
          subject,
          className: f.class?.nameFr || '',
        };

        const extracted = await extractKPForFile(file);
        results.push({
          numericId: f.numericId,
          status: 'extracted',
          shortKeyPoints: extracted.shortKeyPoints,
          keyPoints: extracted.keyPoints,
          topics: extracted.topics,
        });

        if (!dryRun && f.metadata) {
          await prisma.resourceMetadata.update({
            where: { id: f.metadata.id },
            data: {
              keyPoints: extracted.keyPoints,
              shortKeyPoints: extracted.shortKeyPoints,
              topics: extracted.topics,
            },
          });
          revalidatePath(`/ressources/${f.numericId}/${f.slug}`);
          revalidatePath(`/fr/ressources/${f.numericId}/${f.slug}`);
          revalidatePath(`/ar/ressources/${f.numericId}/${f.slug}`);
        }
      } catch (e: any) {
        console.error(`Error for #${f.numericId}:`, e.message);
        results.push({
          numericId: f.numericId,
          status: 'error',
          error: e.message,
        });
      }
    }

    const nextIndex = startIndex + batch.length;
    return NextResponse.json({
      success: true,
      total: totalBuggy,
      processed: batch.length,
      startIndex,
      nextIndex,
      done: nextIndex >= totalBuggy,
      dryRun,
      results,
    });
  } catch (e: any) {
    console.error('Regen error:', e);
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
