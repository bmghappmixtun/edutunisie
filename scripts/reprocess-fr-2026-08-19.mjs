#!/usr/bin/env node
/**
 * Re-process AI attributes in French for 16 'français' files (2026-08-19)
 *
 * User feedback 2026-08-19: 'il faut bien corriger les titres du ar
 * vers fr, format examanet et avec des attribut ia de la meme langue'
 *
 * These 16 files were originally subject='arabe' with all AI
 * attributes (generalSubject, topics, shortKeyPoints, difficulty)
 * in Arabic. After reclassifying to subject='français', the AI
 * attributes need to be regenerated in French to match the
 * content language and the subject.
 *
 * For each file, calls OpenAI with the fullText as input and asks
 * for: generalSubject, topics, shortKeyPoints, longKeyPoints,
 * difficulty, exerciseInsights — all in French.
 */
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const p = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});
const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FRENCH_FILES = [3987, 8259, 4589, 13988, 13960, 9338, 7957, 4592, 7952, 14007, 7955, 7940, 7918, 15365, 7886, 15364];

const SYSTEM_PROMPT = `Tu es un expert en littérature française. Tu analyses des textes littéraires français (extraits, poèmes, fables, nouvelles) pour des étudiants tunisiens de lycée.

Pour CHAQUE texte, tu dois retourner un objet JSON avec EXACTEMENT ces champs:
- "generalSubject": 4-8 mots en FRANÇAIS qui résument le sujet général du texte (ex: "La Fontaine - Fable - Ambition et prudence", "Hugo - Poésie - Misère sociale", "Maupassant - Nouvelle - Condition féminine"). PAS de "نص أدبي" en arabe.
- "topics": tableau de 7-9 mots-clés en FRANÇAIS, 1-2 mots chacun (ex: ["fable", "ambition", "prudence", "moralité", "voyage"])
- "shortKeyPoints": tableau de 3-5 idées essentielles, 2-5 mots chacune en FRANÇAIS (ex: ["L'ambition démesurée", "La chute morale"])
- "longKeyPoints": tableau de 2-4 analyses approfondies en FRANÇAIS, une phrase chacune
- "difficulty": "facile" | "moyen" | "difficile"
- "exerciseInsights": [] (tableau vide pour les textes littéraires, utilisé seulement pour les exercices)

IMPORTANT: Tout doit être en FRANÇAIS. Pas d'arabe. Réponds UNIQUEMENT avec le JSON.`;

async function processOne(id) {
  const r = await p.resource.findFirst({ 
    where: { numericId: id },
    include: { metadata: true }
  });
  if (!r) { console.log('#' + id + ': not found'); return; }
  const c = await p.resourceContent.findFirst({ where: { resourceId: r.id } });
  if (!c || !c.fullText) { console.log('#' + id + ': no fullText'); return; }
  
  const fullText = c.fullText.substring(0, 6000); // cap at 6k chars for OpenAI
  
  const completion = await oai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Analyse ce texte littéraire français et retourne le JSON:\n\n${fullText}` }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });
  
  const result = JSON.parse(completion.choices[0].message.content);
  
  // Update metadata
  await p.resourceMetadata.update({
    where: { resourceId: r.id },
    data: {
      generalSubject: result.generalSubject || r.metadata.generalSubject,
      topics: result.topics || r.metadata.topics,
      shortKeyPoints: result.shortKeyPoints || r.metadata.shortKeyPoints,
      longKeyPoints: result.longKeyPoints || r.metadata.longKeyPoints,
      difficulty: result.difficulty || r.metadata.difficulty,
      exerciseInsights: result.exerciseInsights || r.metadata.exerciseInsights,
      modelUsed: 'gpt-4o-mini-v1-fr-resync',
    }
  });
  
  // Update title to use new generalSubject (in French)
  const arabicMap = { 'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'th', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'h' };
  const properSlugify = (text, maxLen) => {
    let s = text.replace(/[\u0600-\u06FF]/g, c => arabicMap[c] || '');
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    s = s.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    s = s.replace(/^-+|-+$/g, '');
    if (maxLen && s.length > maxLen) s = s.slice(0, maxLen).replace(/-+$/, '');
    return s;
  };
  
  // Get current title parts (type, subject, class, section) and replace topic
  // Title format: "Devoir de Contrôle N°1 - Français - 4AS - Lettres (2011-2012) : TOPIC"
  const titleMatch = r.title.match(/^(.+?)\s*:\s*(.+)$/);
  if (titleMatch) {
    const newTitle = titleMatch[1] + ' : ' + (result.generalSubject || titleMatch[2]);
    const newSlug = properSlugify(newTitle, 80) + '-' + id;
    await p.resource.update({
      where: { id: r.id },
      data: { title: newTitle, slug: newSlug }
    });
  }
  
  console.log('✅ #' + id + ': ' + (result.generalSubject || 'N/A'));
}

async function main() {
  for (const id of FRENCH_FILES) {
    try {
      await processOne(id);
    } catch (e) {
      console.error('❌ #' + id + ':', e.message);
    }
  }
}
main().then(() => p.$disconnect()).catch(e => { console.error('💥', e); p.$disconnect(); process.exit(1); });
