import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const SEED_TOKEN = process.env.SEED_TOKEN || '';

const SYSTEM_PROMPT = `Tu es un expert en SCIENCES DE LA VIE ET DE LA TERRE (SVT) du système éducatif tunisien (lycée : 1AS, 2AS, 3AS, 4AS).

À partir du titre et de la classe/année d'un document SVT tunisien, tu dois générer les éléments suivants en FRANÇAIS :

1. **shortKeyPoints** (3 entrées) : TERMES techniques courts, 2-3 mots maximum chacun. Pas des phrases, juste des TERMES.

2. **keyPoints** (3 entrées) : phrases complètes de 4-6 mots chacune. Phrases courtes résumant les concepts.

3. **topics** (9 entrées) : 1 mot chacun, en minuscule, qui catégorisent le sujet (ex: "nutrition", "génétique", "immunologie", "cellule", "reproduction", "glycémie", "phylogénie", "écosystème", "photosynthèse").

4. **generalSubject** (1 chaîne, 2-6 mots) : le sujet principal du document. Utilisé dans le titre après ":". Doit être :
   - Concis (2-6 mots)
   - En français
   - Refléter le thème principal (ex: "Glycémie", "Procréation", "Évolution biologique", "Régulation de la pression artérielle", "Nutrition minérale", "Diversité du monde microbien", "Hérédité liée au sexe", "Génétique des populations", "Neurophysiologie")

5. **exerciseInsights** (3-5 entrées, UNIQUEMENT si type=DEVOIR ou type=EXERCISE) : aperçu exercice par exercice.
   Format STRICT : "Exercice N: sujet - résumé" où:
   - N est le numéro (1, 2, 3...)
   - sujet est court (3-8 mots)
   - résumé est 1 phrase concise (5-12 mots)
   - EXEMPLE: "Exercice 1: Procréation - Étude de la fonction reproductrice chez l'homme"
   - PAS de guillemets, PAS de préambule

6. **courseSectionInsights** (3-5 entrées, UNIQUEMENT si type=COURSE) : aperçu section par section.
   Format STRICT : "Titre: résumé" où:
   - Titre est court (3-8 mots)
   - résumé est 1 phrase concise (5-12 mots)
   - EXEMPLE: "Nutrition minérale: Absorption de l'eau et des sels minéraux par les racines"
   - PAS de guillemets, PAS de préambule

RÈGLES IMPORTANTES:
- TOUT en FRANÇAIS (jamais d'arabe ou d'anglais)
- Le sujet doit être DÉTAILLÉ et FACTUEL (pas vague comme "biologie" ou "SVT")
- Le nombre est STRICT: 3 shortKeyPoints + 3 keyPoints + 9 topics + 1 generalSubject
- exerciseInsights UNIQUEMENT pour DEVOIR/EXERCISE (sinon [])
- courseSectionInsights UNIQUEMENT pour COURSE (sinon [])

FORMAT DE RÉPONSE (JSON strict):
{
  "shortKeyPoints": ["Terme 1", "Terme 2", "Terme 3"],
  "keyPoints": ["Phrase 1", "Phrase 2", "Phrase 3"],
  "topics": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9"],
  "generalSubject": "Sujet principal concis",
  "exerciseInsights": ["Exercice 1: sujet - résumé", "Exercice 2: sujet - résumé"],
  "courseSectionInsights": ["Titre: résumé", "Titre: résumé"]
}`;

async function processFile(file: any): Promise<any> {
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const userPrompt = `Document SVT lycée tunisien:
Type: ${file.type}
Classe: ${file.className}
Section: ${file.sectionName || 'N/A'}
Titre: ${file.title}
Année: ${file.year || 'N/A'}
Type détaillé: ${file.homeworkSubtype || 'N/A'}

Génère les 3 shortKeyPoints, 3 keyPoints, 9 topics, 1 generalSubject, ET ${file.type === 'COURSE' ? 'courseSectionInsights' : 'exerciseInsights'}.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 800,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('Empty OpenAI response');
  return JSON.parse(content);
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ||
                req.nextUrl.searchParams.get('token');
  if (token !== SEED_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 5;
    const startIndex = body.startIndex || 0;
    const dryRun = body.dryRun === true;
    const skipExisting = body.skipExisting !== false; // default true

    // All SVT lycée files
    const allFiles: any[] = await prisma.resource.findMany({
      where: {
        class: { level: { slug: 'lycee' } },
        subject: { slug: 'svt' },
        status: 'PUBLISHED',
      },
      include: { metadata: true, class: true, section: true },
      orderBy: { numericId: 'asc' },
    });

    // Process files that are missing any of: KP, SKP, topics, generalSubject, or exercise/courseInsights
    const targetFiles = allFiles.filter((f: any) => {
      if (!f.metadata) return true; // no metadata at all
      if (skipExisting && f.metadata.keyPoints?.length > 0) return false; // already has KP
      if (!f.metadata.keyPoints || f.metadata.keyPoints.length === 0) return true;
      if (!f.metadata.shortKeyPoints || f.metadata.shortKeyPoints.length === 0) return true;
      if (!f.metadata.topics || f.metadata.topics.length === 0) return true;
      if (!f.metadata.generalSubject) return true;
      if (f.type === 'DEVOIR' || f.type === 'EXERCISE') {
        if (!f.metadata.exerciseInsights || f.metadata.exerciseInsights.length === 0) return true;
      }
      if (f.type === 'COURSE') {
        if (!f.metadata.courseSectionInsights || f.metadata.courseSectionInsights.length === 0) return true;
      }
      return false;
    });

    const total = targetFiles.length;
    const batch = targetFiles.slice(startIndex, startIndex + batchSize);

    const results: any[] = [];
    for (const f of batch) {
      try {
        const ai = await processFile({
          type: f.type,
          className: f.class?.nameFr || '',
          sectionName: f.section?.nameFr || '',
          title: f.title,
          year: f.year,
          homeworkSubtype: f.homeworkSubtype,
        });

        const isComplete = (
          (ai.shortKeyPoints?.length || 0) >= 3 &&
          (ai.keyPoints?.length || 0) >= 3 &&
          (ai.topics?.length || 0) >= 9 &&
          !!ai.generalSubject &&
          ((f.type === 'COURSE' && (ai.courseSectionInsights?.length || 0) >= 3) ||
           (f.type !== 'COURSE' && (ai.exerciseInsights?.length || 0) >= 3))
        );

        results.push({
          numericId: f.numericId,
          type: f.type,
          title: f.title.substring(0, 50),
          status: 'ok',
          complete: isComplete,
          generalSubject: ai.generalSubject,
          kpCount: ai.keyPoints?.length || 0,
          skpCount: ai.shortKeyPoints?.length || 0,
          topicCount: ai.topics?.length || 0,
          insightCount: f.type === 'COURSE' ? (ai.courseSectionInsights?.length || 0) : (ai.exerciseInsights?.length || 0),
        });

        if (!dryRun) {
          const data: any = {
            keyPoints: ai.keyPoints || [],
            shortKeyPoints: ai.shortKeyPoints || [],
            topics: ai.topics || [],
            generalSubject: ai.generalSubject || null,
            modelUsed: 'gpt-4o-mini-svt-v1',
          };
          if (f.type === 'DEVOIR' || f.type === 'EXERCISE') {
            data.exerciseInsights = ai.exerciseInsights || [];
          }
          if (f.type === 'COURSE') {
            data.courseSectionInsights = ai.courseSectionInsights || [];
          }

          if (f.metadata) {
            await prisma.resourceMetadata.update({
              where: { id: f.metadata.id },
              data,
            });
          } else {
            await prisma.resourceMetadata.create({
              data: { resourceId: f.id, ...data },
            });
          }
          revalidatePath(`/ressources/${f.numericId}/${f.slug}`);
          revalidatePath(`/fr/ressources/${f.numericId}/${f.slug}`);
          revalidatePath(`/ar/ressources/${f.numericId}/${f.slug}`);
        }
      } catch (e: any) {
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
      total,
      processed: batch.length,
      startIndex,
      nextIndex,
      done: nextIndex >= total,
      dryRun,
      results,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
