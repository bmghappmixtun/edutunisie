#!/usr/bin/env node
/**
 * Test Technologie lycée keyInsights generation - SPECIALIZED with METADATA
 * 
 * Detects:
 * - System name (e.g., "Poste de sertissage", "Station de peinture")
 * - Specialty: Génie Mécanique (GM) or Génie Électrique (GE)
 * - Dossier technique presence
 * 
 * Format:
 * - DEVOIR/EXERCISE: "Exercice N: sujet - résumé" (15-25 mots)
 * - COURSE: "Titre: concept résumé" (10-20 mots)
 * - META: [{label, icon, color}] for the bubble display
 */
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { config } from 'dotenv';
import fs from 'fs';

config({ path: '/workspace/edutunisie/.env.local' });

const p = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TEST_FILE = '/tmp/tech_lycee_test.json';
const MODEL = 'gpt-4o-mini';

// ========== SPECIALIZED PROMPTS ==========

const PROMPT_1ERE_2EME_EX = `Tu es un expert en technologie du système éducatif tunisien (lycée 1ère et 2ème année : tronc commun, Sciences, Technologies de l'informatique).
Le programme officiel (Septembre 2019) porte sur l'étude des SYSTÈMES AUTOMATISÉS à travers leurs chaînes d'énergie et d'information, l'analyse fonctionnelle, structurelle et comportementale.

Analyse ce document (titre: {TITLE}) et extrais TOUS les exercices ou parties.

Pour CHAQUE exercice/partie: "Exercice N: [type d'étude, 5-10 mots] - [résumé FR, 10-25 mots avec vocabulaire technique précis]"

Les 4 GRANDS AXES d'un exercice de technologie 1ère/2ème année sont:
  A. ANALYSE FONCTIONNELLE (bête à cornes, actigramme A-0, A0, fonctions de service, validité)
  B. ANALYSE STRUCTURELLE (actionneurs, pré-actionneurs, capteurs, chaîne fonctionnelle, identification)
  C. ÉTUDE TEMPORELLE / GRAFCET (tableau des tâches, GRAFCET niveau 1/2/3, conditions de début/fin)
  D. REPRÉSENTATION GRAPHIQUE (schéma cinématique, projection orthogonale, cotation dimensionnelle)

Exemples valides:
  "Exercice 1: Analyse fonctionnelle - Compléter la bête à cornes et identifier les fonctions de service du système."
  "Exercice 2: Structure du système - Identifier actionneurs, pré-actionneurs et capteurs dans un tableau."
  "Exercice 3: GRAFCET point de vue système - Compléter le GRAFCET niveau 1 du cycle de production."

Si le document contient peu d'exercices identifiables, retourne 1-3 items génériques mais utiles.
Retourne UNIQUEMENT JSON: {"exercises": ["Exercice 1: ... - ...", ...]}
Limite: 1-8 items.
Nonce: {NONCE}`;

const PROMPT_1ERE_2EME_COURSE = `Tu es un expert en technologie du système éducatif tunisien (lycée 1ère et 2ème année).

Analyse ce COURS (titre: {TITLE}) et extrais les sous-titres / parties principales.

Pour CHAQUE sous-titre: "Titre exact: concept technologique clé résumé en 10-20 mots"

Le programme couvre:
  1. Analyse fonctionnelle externe (bête à cornes, diagramme pieuvre)
  2. Analyse fonctionnelle interne (actigrammes SADT)
  3. Analyse structurelle (chaîne d'énergie, chaîne d'information)
  4. GRAFCET (points de vue système/PO/PC)

Exemples:
  "Analyse fonctionnelle externe: Identification du besoin, diagramme pieuvre, fonctions de service."
  "Chaîne d'énergie: Alimenter, distribuer, convertir et transmettre l'énergie au système."
  "GRAFCET point de vue PC: Description des équations logiques des étapes et transitions."

Retourne UNIQUEMENT JSON: {"sections": ["Titre: résumé", ...]}
Limite: 1-8 sections.
Nonce: {NONCE}`;

const PROMPT_GM_EX = `Tu es un expert en GÉNIE MÉCANIQUE du système éducatif tunisien (3ème et 4ème année Sciences Techniques - Génie Mécanique).
Le programme officiel porte sur l'analyse et la conception de systèmes mécaniques industriels.

Analyse ce document (titre: {TITLE}) et extrais TOUS les exercices ou parties.

Pour CHAQUE exercice/partie: "Exercice N: [domaine GM, 5-10 mots] - [résumé FR, 10-25 mots avec vocabulaire GM précis]"

Les GRANDS AXES en Génie Mécanique:
  A. ANALYSE FONCTIONNELLE (bête à cornes, CdCF, validation)
  B. ANALYSE STRUCTURELLE (graphe des liaisons, classes d'équivalence, schéma cinématique)
  C. ÉTUDE CINÉMATIQUE (rapports de transmission, vitesses, couples, puissances, rendement)
  D. DESSIN TECHNIQUE (projection orthogonale, cotation fonctionnelle, chaîne de cotes, ajustements)
  E. RÉSISTANCE DES MATÉRIAUX (contraintes, déformations, flexion, torsion)
  F. MÉTROLOGIE / FABRICATION (machines-outils, GPAO, usinage)

Exemples:
  "Exercice 1: Analyse fonctionnelle - Compléter le diagramme pieuvre et rédiger le cahier des charges."
  "Exercice 2: Graphe des liaisons - Identifier les classes d'équivalence et tracer le graphe."
  "Exercice 3: Schéma cinématique - Compléter le schéma avec les symboles normalisés des liaisons."
  "Exercice 4: Cotation fonctionnelle - Établir la chaîne de cotes relative à la condition Ja."
  "Exercice 5: RDM - Calculer la contrainte maximale et vérifier la condition de résistance."

Retourne UNIQUEMENT JSON: {"exercises": ["Exercice 1: ... - ...", ...]}
Limite: 1-8 items.
Nonce: {NONCE}`;

const PROMPT_GM_COURSE = `Tu es un expert en GÉNIE MÉCANIQUE du système éducatif tunisien (3ème et 4ème année Sciences Techniques).

Analyse ce COURS (titre: {TITLE}) et extrais les sous-titres / parties principales.

Pour CHAQUE sous-titre: "Titre exact: concept mécanique clé résumé en 10-20 mots"

Le programme couvre:
  1. Analyse fonctionnelle (bête à cornes, CdCF, validation)
  2. Analyse structurelle (graphe de liaisons, classes d'équivalence)
  3. Schéma cinématique
  4. Cotation fonctionnelle (chaîne de cotes, conditions Ja)
  5. Cinématique (transmission de puissance, rapports, rendement)
  6. Résistance des matériaux (RDM)
  7. Dessin technique (projection, coupes, sections)
  8. Procédés de fabrication (tournage, fraisage, perçage, rectification)

Exemples:
  "Analyse fonctionnelle externe: Étude du besoin, validation, diagramme pieuvre."
  "Cotation fonctionnelle: Chaîne de cotes, conditions Ja, cotes fonctionnelles."

Retourne UNIQUEMENT JSON: {"sections": ["Titre: résumé", ...]}
Limite: 1-8 sections.
Nonce: {NONCE}`;

const PROMPT_GE_EX = `Tu es un expert en GÉNIE ÉLECTRIQUE du système éducatif tunisien (3ème et 4ème année Sciences Techniques - Génie Électrique).

Analyse ce document (titre: {TITLE}) et extrais TOUS les exercices ou parties.

Pour CHAQUE exercice/partie: "Exercice N: [domaine GE, 5-10 mots] - [résumé FR, 10-25 mots avec vocabulaire GE précis]"

Les GRANDS AXES en Génie Électrique:
  A. CIRCUITS ÉLECTRIQUES (monophasé, triphasé, lois, puissances, facteur de puissance)
  B. MACHINES ÉLECTRIQUES (MCC, moteur asynchrone triphasé à cage, moteur pas-à-pas)
  C. ÉLECTRONIQUE (A.L.I. en régime linéaire et saturé, montages comparateurs, astables)
  D. LOGIQUE COMBINATOIRE/SÉQUENTIELLE (opérations binaires, compteurs, bascules, CI 74xxx)
  E. MICROCONTRÔLEURS (architecture PIC, programmation MikroC, commande de moteurs)

Exemples:
  "Exercice 1: Moteur asynchrone - Calculer la vitesse de synchronisme, le glissement et le rendement."
  "Exercice 2: Moteur à courant continu - Étude de la caractéristique n=f(U) et variation de vitesse."
  "Exercice 3: A.L.I. en régime linéaire - Tracer la caractéristique de transfert du montage."
  "Exercice 4: Compteur binaire - Analyser le circuit intégré 74168 et établir le chronogramme."
  "Exercice 5: Microcontrôleur PIC - Écrire le programme en MikroC pour commander un moteur."

Retourne UNIQUEMENT JSON: {"exercises": ["Exercice 1: ... - ...", ...]}
Limite: 1-8 items.
Nonce: {NONCE}`;

const PROMPT_GE_COURSE = `Tu es un expert en GÉNIE ÉLECTRIQUE du système éducatif tunisien (3ème et 4ème année Sciences Techniques).

Analyse ce COURS (titre: {TITLE}) et extrais les sous-titres / parties principales.

Pour CHAQUE sous-titre: "Titre exact: concept électrique clé résumé en 10-20 mots"

Le programme couvre:
  1. Circuits électriques monophasés et triphasés
  2. Machines électriques (MCC, moteur asynchrone triphasé, moteur pas-à-pas)
  3. Électronique analogique (A.L.I. en régimes linéaire et saturé)
  4. Logique combinatoire et séquentielle (CI 74xx, compteurs)
  5. Microcontrôleurs (PIC 16F877A, programmation MikroC)
  6. Variateurs de vitesse, hacheurs
  7. Commande et protection des moteurs

Exemples:
  "Moteur asynchrone triphasé: Constitution, principe de fonctionnement, glissement, caractéristiques."
  "A.L.I. en régime saturé: Montages comparateurs à un et deux seuils, trigger de Schmitt."
  "Microcontrôleur PIC 16F877A: Architecture, mémoire, ports E/S, programmation en MikroC."

Retourne UNIQUEMENT JSON: {"sections": ["Titre: résumé", ...]}
Limite: 1-8 sections.
Nonce: {NONCE}`;

function getPromptForFile(file) {
  const isCourse = file.type === 'COURSE';
  const is3or4 = file.classSlug === '3eme-secondaire' || file.classSlug === '4eme-secondaire';
  const isTechnique = file.sectionSlug === 'technique';
  
  if (is3or4 && isTechnique) {
    const titleLower = (file.title || '').toLowerCase();
    const isMecanique = /m[ée]cani|cin[ée]mati|cotation|r[ée]sistance|mat[ée]riaux|usinage|fraisage|tournage|per[çc]age/i.test(titleLower);
    const isElectrique = /[ée]lectri|[ée]lectroni|moteur|asynchrone|continu|microcontr[oô]leur|a\.l\.i|circuit|compteur|hacheur/i.test(titleLower);
    
    if (isMecanique && !isElectrique) {
      return { type: 'GM', ex: PROMPT_GM_EX, course: PROMPT_GM_COURSE };
    } else if (isElectrique && !isMecanique) {
      return { type: 'GE', ex: PROMPT_GE_EX, course: PROMPT_GE_COURSE };
    }
  }
  
  return { type: '1ère/2ème', ex: PROMPT_1ERE_2EME_EX, course: PROMPT_1ERE_2EME_COURSE };
}

// Extract system name from title (common patterns)
// e.g. "Devoir de Contrôle N°1 - Technologie: Poste de sertissage - ..."
// or "Cours - Technologie - ... : Poste de sertissage"
// or "Devoir - ... - Machine de transfert ..."
function extractSystemName(title) {
  // Pattern 1: After colon and dash
  let m = title.match(/:\s*([^-:]+?)\s*-\s*\d/);
  if (m) return m[1].trim();
  
  // Pattern 2: "Dossier Technique" prefix
  m = title.match(/Dossier\s+[Tt]echnique\s+([^:]+?)\s*[-:]/);
  if (m) return m[1].trim();
  
  // Pattern 3: After "Machine" or "Poste" or "Station" or "Système"
  m = title.match(/(?:Machine|Poste|Station|Système|Unité|Dispositif|Montage)\s+(?:de\s+|d'|d’|d\s+)?([^:]+?)(?:\s*[-:]\s*|\s*$)/i);
  if (m) {
    let name = m[0].replace(/^.*?(Machine|Poste|Station|Système|Unité|Dispositif|Montage)/i, '$1').trim();
    // Truncate to reasonable length
    if (name.length > 60) name = name.slice(0, 57) + '...';
    return name;
  }
  
  // Pattern 4: After the year
  m = title.match(/\((?:19|20)\d{2}[^)]*\)\s*:\s*(.+)$/);
  if (m) return m[1].trim();
  
  return null;
}

// Detect specialty more robustly from content
function detectSpecialty(file, text) {
  const titleLower = (file.title || '').toLowerCase();
  const textLower = (text || '').toLowerCase();
  
  // GM keywords
  const gmKw = ['liaison', 'cinématique', 'cotation', 'engrenage', 'poulie', 'courroie', 'bielle', 'came', 'vérin mécanique', 'matériaux', 'r dm', 'rdm', 'contrainte', 'flexion', 'torsion', 'ajustement', 'tolérance', 'classe d\'équivalence', 'graphe des liaisons', 'fraisage', 'tournage', 'perçage', 'projection orthogonale', 'matière d\'œuvre', 'matière d\'oeuvre'];
  // GE keywords
  const geKw = ['moteur asynchrone', 'mcc', 'moteur à courant', 'microcontrôleur', 'microcontroleur', 'mikroc', 'pic 16f', 'a.l.i', 'amplificateur', 'comparateur', 'compteur', 'hacheur', 'moteur pas-à-pas', 'moteur pas a pas', 'logique combinatoire', 'logique séquentielle', 'monophasé', 'triphasé', 'triphase', 'facteur de puissance', 'basculer', 'astable', 'monostable', '74168', 'ci 74', 'circuit intégré', 'mikro c'];
  
  const gmCount = gmKw.filter(k => titleLower.includes(k) || textLower.includes(k)).length;
  const geCount = geKw.filter(k => titleLower.includes(k) || textLower.includes(k)).length;
  
  if (gmCount > geCount && gmCount >= 2) return 'GM';
  if (geCount > gmCount && geCount >= 2) return 'GE';
  return null;
}

async function getTextFromDB(resourceId) {
  const c = await p.resourceContent.findUnique({ where: { resourceId } });
  return c?.fullText && c.fullText.length > 200 ? c.fullText : null;
}

async function callOpenAI(system, text) {
  try {
    const resp = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `---DOC---\n${text.slice(0, 20000)}\n---END---` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2500,
    });
    const parsed = JSON.parse(resp.choices[0].message.content);
    if (parsed.exercises) return parsed.exercises.filter(e => e.includes('Exercice') && e.includes(':') && e.includes(' - ') && e.length < 400);
    if (parsed.sections) return parsed.sections.filter(s => !s.startsWith('(') && s.includes(':') && s.length < 400);
    return null;
  } catch (e) {
    return null;
  }
}

function buildMeta(file, text) {
  const meta = [];
  
  // System name
  const systemName = extractSystemName(file.title);
  if (systemName) {
    meta.push({ label: systemName, icon: 'wrench', color: 'indigo' });
  }
  
  // Specialty
  const specialty = detectSpecialty(file, text);
  if (specialty === 'GM') {
    meta.push({ label: 'Génie Mécanique', icon: 'cog', color: 'slate' });
  } else if (specialty === 'GE') {
    meta.push({ label: 'Génie Électrique', icon: 'zap', color: 'amber' });
  }
  
  // Dossier technique
  if (text && /dossier\s+technique/i.test(text)) {
    meta.push({ label: 'Dossier technique', icon: 'file', color: 'sky' });
  }
  
  return meta;
}

async function main() {
  const files = JSON.parse(fs.readFileSync(TEST_FILE, 'utf8'));
  console.log(`Total test files: ${files.length}\n`);
  
  const results = [];
  for (const f of files) {
    const promptSet = getPromptForFile(f);
    const isCourse = f.type === 'COURSE';
    const systemTemplate = isCourse ? promptSet.course : promptSet.ex;
    const system = systemTemplate.replace('{TITLE}', f.title.slice(0, 120)).replace('{NONCE}', `${f.numericId}-${Date.now()}`);
    
    const text = await getTextFromDB(f.id);
    const systemName = extractSystemName(f.title);
    const specialty = detectSpecialty(f, text);
    const hasDossier = text && /dossier\s+technique/i.test(text);
    const meta = buildMeta(f, text);
    
    console.log('━'.repeat(70));
    console.log(`📄 #${f.numericId} (${f.type}) - ${promptSet.type} - ${f.category}`);
    console.log(`   ${f.title.slice(0, 100)}`);
    console.log(`   ${f.class} / ${f.section || '(no section)'} [text=${f.text_len}]`);
    console.log(`   🎯 System: ${systemName || '(not detected)'}`);
    console.log(`   🎯 Specialty: ${specialty || '(ambiguous)'}`);
    console.log(`   🎯 Dossier: ${hasDossier ? 'YES' : 'no'}`);
    console.log(`   🎯 Meta: ${JSON.stringify(meta)}`);
    console.log('━'.repeat(70));
    
    if (!text) {
      console.log('   ❌ No text\n');
      results.push({ ...f, error: 'no_text', systemName, specialty, hasDossier, meta });
      continue;
    }
    
    const insights = await callOpenAI(system, text);
    
    if (!insights || insights.length === 0) {
      console.log('   ⚠️ No insights returned\n');
      results.push({ ...f, insights: [], promptType: promptSet.type, systemName, specialty, hasDossier, meta });
      continue;
    }
    
    console.log(`\n   📋 Generated ${insights.length} keyInsights (${promptSet.type}):`);
    insights.forEach((ki, i) => console.log(`      ${i + 1}. ${ki}`));
    console.log('');
    
    results.push({ ...f, insights, promptType: promptSet.type, systemName, specialty, hasDossier, meta });
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('━'.repeat(70));
  console.log(`✅ Done. ${results.filter(r => r.insights?.length).length}/${files.length} files have insights`);
  fs.writeFileSync('/tmp/tech_lycee_test_results.json', JSON.stringify(results, null, 2));
  
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
