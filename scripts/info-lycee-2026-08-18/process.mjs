#!/usr/bin/env node
/**
 * Pipeline complète pour Informatique lycée (2026-08-18)
 *
 * Pour chaque fichier :
 *   1. Télécharge le PDF (via proxy examanet.com)
 *   2. Extrait le texte des 2 premières pages (pdfjs-dist)
 *   3. Appelle GPT-4o-mini pour extraire :
 *      - header : class, section, subject, type, year, schoolName, schoolType,
 *                 hasCorrection, profNames, homeworkSubtype, homeworkNumber
 *      - AI : generalSubject (SPECIFIC), 9 single-word tags,
 *             shortKeyPoints (3-5), longKeyPoints (3-5),
 *             exerciseInsights (par exercice), difficulty, duration, level
 *   4. Update Resource (schoolName, schoolType, headerData, homeworkSubtype, homeworkNumber)
 *      + ResourceMetadata (le reste)
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node process.mjs [--ids=1,2,3] [--limit=10] [--dry-run] [--only-missing]
 */

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
GlobalWorkerOptions.workerSrc = join(__dirname, '../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY manquant');
  process.exit(1);
}

const PROXY_BASE = 'https://examanet.com';
const INTERNAL_TOKEN = process.env.INTERNAL_BULK_TOKEN || 'devmanet-bulk-2026';

// Args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ONLY_MISSING = args.includes('--only-missing');
const idArg = args.find(a => a.startsWith('--ids='));
const IDS = idArg ? idArg.slice(6).split(',').map(Number) : null;
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.slice(8)) : null;

console.log('🧠 Pipeline Informatique lycée (2026-08-18)');
console.log(`   Mode: ${DRY_RUN ? 'DRY-RUN' : 'COMMIT'}${ONLY_MISSING ? ' (only-missing)' : ''}${IDS ? ` (IDs: ${IDS.join(',')})` : ''}${LIMIT ? ` (limit: ${LIMIT})` : ''}`);

// =============================================================================
// PDF text extraction
// =============================================================================
async function extractPdfText(pdfBuffer, maxPages = 2) {
  const pdf = await getDocument({
    data: new Uint8Array(pdfBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;
  const pages = [];
  for (let i = 1; i <= Math.min(maxPages, pdf.numPages); i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => 'str' in item ? item.str : '').join(' ');
    pages.push(text);
  }
  return {
    text: pages.join('\n\n---\n\n'),
    pageCount: pdf.numPages,
  };
}

// =============================================================================
// GPT-4o-mini extraction
// =============================================================================
const SYSTEM_PROMPT = `Tu es un expert du système éducatif tunisien, spécialisé en INFORMATIQUE au LYCÉE (1AS, 2AS, 3AS, 4AS).

Tu analyses l'en-tête d'un PDF scolaire tunisien pour en extraire les métadonnées + générer les attributs AI.

**CONNAISSANCES DU PROGRAMME TUNISIEN INFORMATIQUE LYCÉE :**

* **1AS (1ère année)** : tronc commun. 1 matière "Informatique" (1h/sem). 6 sections : Sciences, Mathématiques, Lettres, Économie-Gestion, Technique, Sciences de l'informatique.

* **2AS (2ème année)** : 2 sections : "Économie et services" + "Technologies de l'informatique (TI)". 1 matière "Informatique" combinée (5h/sem) - culture générale, architecture, OS, réseaux, bureautique, algorithmique.

* **3AS (3ème année)** : 5 sections principales (Math, Sciences Exp, Lettres, Économie-Gestion, Sciences de l'informatique). Pour Sciences Info : 3 matières = **Algorithmique et Programmation** + **TIC** + **Système d'exploitation et réseaux**. Pour autres : Bureautique/Informatique générale.

* **4AS (4ème année - Bac)** : 7 sections (Math, Sciences Exp, Sciences Tech, Sciences Info, Économie-Gestion, Lettres, Sport).
  - **Sciences de l'informatique** : 3 matières = Algo/Prog + TIC + Bases de Données
  - **Math/Sciences Exp/Sciences Tech** : 1 matière "Informatique" (algo+prog, 2h/sem)
  - **Lettres** : Bureautique et Multimédia
  - **Économie-Gestion** : Bureautique et Base de données
  - **Sport** : Bureautique

**LYCÉE PILOTE** : ce sont des lycées d'élite (Lycée Pilote de Tunis, Sousse, Sfax, etc.). Détecte si l'en-tête mentionne "Lycée Pilote" → schoolType="PILOTE", sinon "PUBLIC".

**CORRIGÉ** : si le PDF contient un corrigé (souvent "Corrigé" ou "Correction" en en-tête) → hasCorrection=true.

**WORKFLOW :**

1. Lis le texte extrait du PDF (les 2 premières pages, surtout l'en-tête).
2. Identifie : classe, section, matière, type, année scolaire, prof, lycée, pilote/ordinaire, corrigé.
3. Génère les attributs AI :
   - **generalSubject** : SOIS SPÉCIFIQUE. PAS de "Informatique générale" ou "Algorithmique". Sois précis : "Algorithmes de tri en Python", "Modèle OSI", "SQL - Requêtes SELECT", "HTML5 - Structure sémantique", etc. Max 6 mots.
   - **topics** : exactement 9 tags, **UN SEUL MOT CHACUN** (ex: "tri", "récursivité", "pointeurs", "HTML", "CSS", "PHP", "SQL", "réseau", "OS"). Varie : 2-3 sur la compétence/thème, 2-3 sur le sujet, 1-2 sur le type, 1-2 sur le niveau.
   - **shortKeyPoints** : 3-5 points TRÈS COURTS (2-5 mots max).
   - **longKeyPoints** : 3-5 points LONGS (1 phrase complète, 8-15 mots).
   - **exerciseInsights** : UNIQUEMENT si type ∈ [DEVOIR_CONTROLE, DEVOIR_SYNTHESE, EXERCICE, DEVOIR_MAISON]. Format : "Exercice N: sujet - résumé court" (1 ligne par exercice, max 10 lignes).
   - **difficulty** : "facile" | "moyen" | "difficile"
   - **duration** : "1h" | "2h" | "1h30" etc.
   - **level** : "standard" | "avancé"

**RÉPONSE** : UNIQUEMENT un JSON valide avec ces clés EXACTES :
{
  "class": "1AS|2AS|3AS|4AS",
  "section": "Sciences Info|Math|Lettres|Eco-Gestion|Technique|Sciences Exp|Sciences Tech|Sport|eco-services|tech-info|Eco et services",
  "subject": "Informatique|Algorithmique et Programmation|TIC|Bases de Données|Système d'exploitation et réseaux",
  "type": "COURS|EXERCICE|DEVOIR_CONTROLE|DEVOIR_SYNTHESE|DEVOIR_MAISON|EXAMEN|REVISION|AUTRE",
  "year": "2018-2019",
  "schoolName": "Lycée ...",
  "schoolType": "PILOTE|PUBLIC",
  "hasCorrection": true|false,
  "profNames": ["Mr. X", "Mme Y"],
  "homeworkSubtype": "CONTROL|SYNTHESIS|HOUSEWORK|null",
  "homeworkNumber": 1,
  "generalSubject": "...",
  "topics": ["...", "..."],
  "shortKeyPoints": ["..."],
  "longKeyPoints": ["..."],
  "exerciseInsights": ["..."],
  "difficulty": "facile|moyen|difficile",
  "duration": "1h|2h|null",
  "level": "standard|avancé"
}

Si un champ n'est pas détectable, mets null. Ne mets JAMAIS de texte en dehors du JSON.`;

async function callGPT(text, title) {
  const userMessage = `TITRE: ${title}

TEXTE EXTRAIT DU PDF (2 premières pages):
---
${text.substring(0, 4000)}
---

Analyse et retourne le JSON.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${errText.substring(0, 200)}`);
  }
  const data = await res.json();
  let content = data.choices[0].message.content.trim();
  if (content.startsWith('```')) {
    content = content.split('```')[1];
    if (content.startsWith('json')) content = content.slice(4);
    content = content.trim();
    if (content.endsWith('```')) content = content.slice(0, -3);
  }
  return JSON.parse(content);
}

// =============================================================================
// DB mapping
// =============================================================================
const SUBJECT_SLUGS = {
  'Informatique': 'informatique',
  'Algorithmique et Programmation': 'algo-prog',
  'TIC': 'tic',
  'Bases de Données': 'bases-donnees',
  'Système d\'exploitation et réseaux': 'systeme-exploitation-reseaux',
};

const SECTION_SLUGS = {
  'Sciences Info': 'sciences-informatique',
  'Math': 'maths',
  'Lettres': 'lettres',
  'Eco-Gestion': 'eco-gestion',
  'Technique': 'technique',
  'Sciences Exp': 'sciences-experimentales',
  'Sciences Tech': 'sciences-techniques',
  'Sport': 'sport',
  'eco-services': 'eco-services',
  'tech-info': 'technologies-informatique',
  'Eco et services': 'eco-services',
};

const TYPE_MAP = {
  'COURS': 'COURS',
  'EXERCICE': 'EXERCICE',
  'DEVOIR_CONTROLE': 'HOMEWORK',
  'DEVOIR_SYNTHESE': 'HOMEWORK',
  'DEVOIR_MAISON': 'HOMEWORK',
  'EXAMEN': 'EXAMEN',
  'REVISION': 'REVISION',
  'AUTRE': 'OTHER',
};

// =============================================================================
// Main
// =============================================================================
const prisma = new PrismaClient();

async function main() {
  // Build where clause
  const where = {
    subject: {
      slug: { in: ['informatique', 'algo-prog', 'bases-donnees', 'tic', 'systeme-exploitation-reseaux'] },
    },
  };
  if (IDS) where.numericId = { in: IDS };
  if (ONLY_MISSING) where.metadata = { generalSubject: null };

  const resources = await prisma.resource.findMany({
    where,
    include: { subject: true, class: { include: { level: true } }, metadata: true, section: true },
    orderBy: { numericId: 'asc' },
    take: LIMIT || undefined,
  });
  console.log(`📦 ${resources.length} fichiers à traiter`);

  let success = 0, errors = 0, skipped = 0;
  const errorDetails = [];

  for (let i = 0; i < resources.length; i++) {
    const r = resources[i];
    const progress = `[${i + 1}/${resources.length}]`;
    console.log(`\n${progress} #${r.numericId} ${r.title.substring(0, 70)}`);
    console.log(`   Subject=${r.subject.slug} Class=${r.class?.slug}`);

    // Skip if already fully processed and --only-missing
    if (ONLY_MISSING && r.metadata?.generalSubject && r.metadata?.topics?.length === 9) {
      console.log(`   ⏭️  Skipped (already complete)`);
      skipped++;
      continue;
    }

    try {
      // 1. Download PDF via proxy
      const pdfUrl = `${PROXY_BASE}/api/blob-teacher/${r.fileKey}`;
      const pdfRes = await fetch(pdfUrl, {
        headers: { 'X-Internal-Token': INTERNAL_TOKEN },
      });
      if (!pdfRes.ok) {
        throw new Error(`PDF download failed: ${pdfRes.status} ${pdfRes.statusText}`);
      }
      const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

      // 2. Extract text
      const { text, pageCount } = await extractPdfText(pdfBuffer, 2);
      if (!text || text.length < 30) {
        throw new Error(`Text too short: ${text?.length || 0} chars`);
      }
      console.log(`   📄 ${text.length} chars extracted (${pageCount} pages)`);

      // 3. Call GPT
      const ai = await callGPT(text, r.title);
      console.log(`   🤖 AI: class=${ai.class} subject=${ai.subject} type=${ai.type}`);
      console.log(`      GS: "${ai.generalSubject}"`);
      console.log(`      Tags: ${ai.topics?.length || 0} (need 9)`);
      console.log(`      SKP: ${ai.shortKeyPoints?.length || 0} LKP: ${ai.longKeyPoints?.length || 0} EI: ${ai.exerciseInsights?.length || 0}`);

      if (DRY_RUN) {
        success++;
        continue;
      }

      // 4. Update Resource
      const resourceUpdate = {};
      if (ai.schoolName && r.schoolName !== ai.schoolName) resourceUpdate.schoolName = ai.schoolName;
      if (ai.schoolType && r.schoolType !== ai.schoolType) resourceUpdate.schoolType = ai.schoolType;
      if (ai.year && r.year !== ai.year) resourceUpdate.year = ai.year;
      if (ai.type) {
        const dbType = TYPE_MAP[ai.type];
        if (dbType && r.type !== dbType) resourceUpdate.type = dbType;
      }
      if (ai.homeworkSubtype && (r.homeworkSubtype !== ai.homeworkSubtype)) {
        resourceUpdate.homeworkSubtype = ai.homeworkSubtype;
      }
      if (ai.homeworkNumber && r.homeworkNumber !== ai.homeworkNumber) {
        resourceUpdate.homeworkNumber = ai.homeworkNumber;
      }
      if (ai.hasCorrection !== undefined && r.hasCorrection !== ai.hasCorrection) {
        resourceUpdate.hasCorrection = ai.hasCorrection;
      }
      if (ai.profNames?.length > 0) {
        // Don't override teacherId, but store names
        resourceUpdate.teacherNameAr = ai.profNames.join(', ');
      }
      if (Object.keys(resourceUpdate).length > 0) {
        resourceUpdate.headerData = ai;
        await prisma.resource.update({
          where: { id: r.id },
          data: resourceUpdate,
        });
      }

      // 5. Update subject (if needed)
      if (ai.subject) {
        const newSubjectSlug = SUBJECT_SLUGS[ai.subject];
        if (newSubjectSlug && newSubjectSlug !== r.subject.slug) {
          const newSubj = await prisma.subject.findUnique({ where: { slug: newSubjectSlug } });
          if (newSubj) {
            await prisma.resource.update({ where: { id: r.id }, data: { subjectId: newSubj.id } });
            console.log(`   🔀 Subject reclassified: ${r.subject.slug} → ${newSubjectSlug}`);
          }
        }
      }

      // 6. Update section (if applicable)
      if (ai.section && r.classId) {
        const newSectionSlug = SECTION_SLUGS[ai.section];
        if (newSectionSlug) {
          const newSec = await prisma.section.findFirst({
            where: { slug: newSectionSlug, classId: r.classId },
          });
          if (newSec && newSec.id !== r.sectionId) {
            await prisma.resource.update({ where: { id: r.id }, data: { sectionId: newSec.id } });
            console.log(`   🔀 Section updated: ${newSectionSlug}`);
          }
        }
      }

      // 7. Update or create ResourceMetadata
      const metaData = {
        generalSubject: ai.generalSubject || null,
        topics: ai.topics || [],
        shortKeyPoints: ai.shortKeyPoints || [],
        keyPoints: ai.longKeyPoints || [],
        exerciseInsights: ai.exerciseInsights || [],
        difficulty: ai.difficulty || null,
        level: ai.level || null,
        schoolName: ai.schoolName || null,
        profNames: ai.profNames || [],
        year: ai.year || null,
        type: ai.type || null,
        subject: ai.subject || null,
        modelUsed: 'gpt-4o-mini-v1-reanalyze',
      };

      if (r.metadata) {
        await prisma.resourceMetadata.update({
          where: { resourceId: r.id },
          data: { ...metaData, extractedAt: new Date() },
        });
      } else {
        await prisma.resourceMetadata.create({
          data: { resourceId: r.id, ...metaData },
        });
      }
      success++;
      console.log(`   ✅ Done`);
    } catch (e) {
      errors++;
      errorDetails.push({ id: r.numericId, error: e.message });
      console.log(`   ❌ ${e.message.substring(0, 200)}`);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`   ✅ Success: ${success}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  if (errorDetails.length > 0) {
    console.log(`\n📋 ERREURS:`);
    for (const e of errorDetails) {
      console.log(`   #${e.id}: ${e.error.substring(0, 100)}`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error('💥 Fatal:', e);
    prisma.$disconnect();
    process.exit(1);
  });
