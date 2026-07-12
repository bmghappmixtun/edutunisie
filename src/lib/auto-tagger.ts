/**
 * Smart Auto-Tagger — Generates relevant SEO tags for a resource
 *
 * Sources:
 *  1. Title (tokenized, stop-words removed, camelCase-aware)
 *  2. Subject (slug + name)
 *  3. Class (level-based keywords: "bac", "lycee", "college")
 *  4. Section (slug-based keywords: "math", "sc-exp", "si", "eco")
 *  5. Type (HOMEWORK→devoir, COURSE→cours, etc.)
 *  6. School year (formatted as "2024-2025")
 *  7. Trimestre (T1/T2/T3 → "trimestre-1")
 *  8. Homework context (subtype + number)
 *  9. Has-correction flag
 *
 * Output: deduped, normalized, lowercase, ASCII-safe
 * Max 12 tags per resource
 */

import { CLASSES, getSectionsForClass } from './teacher-workflow-data';

// ============================================================================
// STOP WORDS (FR + AR transliterated)
// ============================================================================
const STOP_WORDS_FR = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux', 'a', 'à',
  'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car',
  'ce', 'cette', 'ces', 'ceci', 'cela', 'ça', 'ceux', 'celles',
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'notre', 'votre', 'leur', 'leurs',
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'qui', 'que', 'quoi', 'dont', 'où', 'lequel', 'laquelle',
  'est', 'sont', 'était', 'étaient', 'soit', 'sera', 'seront',
  'a', 'as', 'avons', 'avez', 'ont',
  'pour', 'par', 'avec', 'sans', 'sous', 'sur', 'dans', 'entre', 'vers', 'chez',
  'si', 'oui', 'non', 'peut', 'être',
  'mr', 'mme', 'm.', 'monsieur', 'madame', 'élève', 'eleve', 'prof', 'professeur', 'enseignant',
  'n', 'n°', 'no', 'numéro', 'numero', 'n°1', 'n°2', 'n°3', 'n°4', 'n°5', 'n°6',
]);

// ============================================================================
// SUBJECT → KEYWORDS MAPPING
// ============================================================================
const SUBJECT_KEYWORDS: Record<string, string[]> = {
  mathematiques: ['maths', 'mathematiques', 'math'],
  physique: ['physique', 'sciences-physiques', 'sciences-physique'],
  svt: ['svt', 'sciences-vie-terre', 'biologie', 'sciences-naturelles'],
  francais: ['francais', 'français', 'langue-francaise'],
  anglais: ['anglais', 'english', 'langue-anglaise'],
  arabe: ['arabe', 'عربية', 'langue-arabe'],
  'histoire-geographie': ['histoire', 'geographie', 'hg', 'histoire-geographie'],
  'philosophie': ['philo', 'philosophie'],
  'informatique': ['informatique', 'info', 'tic', 'numérique'],
  'algo-prog': ['algorithmique', 'programmation', 'algo', 'coding'],
  'tic': ['tic', 'technologies-information'],
  'bases-donnees': ['bd', 'sql', 'base-de-donnees', 'bases-de-donnees'],
  'systeme-exploitation-reseaux': ['reseaux', 'systeme-exploitation', 'os', 'linux', 'windows'],
  'economie': ['economie', 'économie', 'sciences-economiques'],
  'gestion': ['gestion', 'comptabilite', 'management'],
  'sport': ['sport', 'eps', 'education-physique'],
  'technologie': ['technologie', 'techno', 'technique'],
  'education-islamique': ['education-islamique', 'islamique', 'religion'],
  'education-civique': ['education-civique', 'civique', 'civisme'],
  'education-artistique': ['education-artistique', 'art', 'arts-plastiques'],
  'education-musicale': ['education-musicale', 'musique'],
};

// ============================================================================
// CLASS → KEYWORDS MAPPING
// ============================================================================
const CLASS_KEYWORDS: Record<string, string[]> = {
  '7eme':  ['7eme', '7eme-annee', 'college', 'enseignement-base'],
  '8eme':  ['8eme', '8eme-annee', 'college', 'enseignement-base'],
  '9eme':  ['9eme', '9eme-annee', 'college', 'enseignement-base', 'concours-9eme'],
  '1ere-annee': ['1ere-annee', '1as', 'lycee', 'seconde', 'tronc-commun'],
  '2eme-annee': ['2eme-annee', '2as', 'lycee'],
  '3eme-annee': ['3eme-annee', '3as', 'lycee', 'bac'],
  '4eme-annee': ['4eme-annee', '4as', 'bac', 'terminale', 'baccalaureat'],
};

// ============================================================================
// SECTION → KEYWORDS MAPPING
// Slugs are unique per class. When the same slug exists in 2AS and 3AS/4AS,
// the disambiguation is done by the classSlug + sectionSlug combo (handled
// in the autoGenerateTags function below).
// ============================================================================
const SECTION_KEYWORDS: Record<string, string[]> = {
  // 2AS
  'sciences':                  ['sciences', '2as-sciences'],
  'technologies-informatique': ['ti', 'technologies-informatique', '2as-ti'],
  'eco-services':              ['eco-services', 'economie-services', '2as-eco'],
  'lettres':                   ['lettres', 'adab', '2as-lettres'],
  'sport':                     ['sport', '2as-sport'],
  // 3AS + 4AS
  'maths':                     ['maths', 'bac-math', 'bac-mathematiques'],
  'sciences-exp':              ['sciences-exp', 'bac-sciences', 'sc-exp', 'sciences-experimentales'],
  'technique':                 ['technique', 'bac-technique', 'sciences-techniques'],
  'sciences-informatique':     ['si', 'sciences-informatique', 'bac-info', 'bac-si'],
  'eco-gestion':               ['eco-gestion', 'bac-eco', 'economie-gestion'],
  'bac-sport':                 ['bac-sport'],
  'bac-lettres':               ['bac-lettres'],
};

// Map 2AS sciences slug to 'sciences' (already mapped above)
// 3AS/4AS 'sciences' slug actually means Sciences Expérimentales — map separately:
const SECTION_KEYWORDS_3AS_4AS: Record<string, string[]> = {
  // 3AS + 4AS — different slugs
  'sciences':                  ['sciences-exp', 'bac-sciences', 'sc-exp', 'sciences-experimentales'],
  'sport':                     ['bac-sport'],
  'lettres':                   ['bac-lettres'],
};

// ============================================================================
// TYPE → KEYWORDS MAPPING
// ============================================================================
const TYPE_KEYWORDS: Record<string, string[]> = {
  HOMEWORK:   ['devoir', 'homework', 'devoir-surveille', 'controle', 'synthese', 'maison'],
  EXERCISE:   ['exercice', 'serie', 'td', 'tp', 'entrainement', 'applications'],
  COURSE:     ['cours', 'lecon', 'chapitre', 'fiche-cours'],
  REVISION:   ['revision', 'bac-blanc', 'rattrapage', 'synthese'],
  EXAM:       ['examen', 'epreuve', 'controle', 'composition'],
  BAC_SUBJECT:['bac', 'sujet-bac', 'epreuve-bac', 'baccalaureat'],
  CORRECTION: ['corrige', 'correction', 'solution'],
  SUMMARY:    ['resume', 'fiche', 'synthese'],
  OTHER:      ['document', 'ressource', 'pedagogique'],
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export interface AutoTaggerInput {
  title: string;
  subjectSlug: string;
  classSlug: string;
  sectionSlug?: string | null;
  type: string;
  year?: string | null;
  trimester?: string | null;
  homeworkSubtype?: string | null;
  homeworkNumber?: number | null;
  hasCorrection?: boolean;
}

export function autoGenerateTags(input: AutoTaggerInput): string[] {
  const tags = new Set<string>();
  const normalizedTitle = normalize(input.title);

  // 1) Title tokens
  const titleTokens = tokenizeTitle(normalizedTitle);
  for (const token of titleTokens) {
    tags.add(token);
  }

  // 2) Subject keywords
  const subjectKw = SUBJECT_KEYWORDS[input.subjectSlug];
  if (subjectKw) {
    subjectKw.forEach(k => tags.add(k));
  }
  // Always add the subject slug itself
  if (input.subjectSlug) {
    tags.add(input.subjectSlug);
  }

  // 3) Class keywords
  const classKw = CLASS_KEYWORDS[input.classSlug];
  if (classKw) {
    classKw.forEach(k => tags.add(k));
  }

  // 4) Section keywords
  if (input.sectionSlug) {
    // For 3AS+4AS, slugs like 'sciences' actually mean Sciences Expérimentales
    // (because 2AS has 'sciences' too but with different meaning)
    const isLycee = ['3eme-annee', '4eme-annee'].includes(input.classSlug);
    const sectionKw = isLycee
      ? (SECTION_KEYWORDS_3AS_4AS[input.sectionSlug] || SECTION_KEYWORDS[input.sectionSlug])
      : SECTION_KEYWORDS[input.sectionSlug];
    if (sectionKw) {
      sectionKw.forEach(k => tags.add(k));
    }
    tags.add(input.sectionSlug);
  }

  // 5) Type keywords
  const typeKw = TYPE_KEYWORDS[input.type];
  if (typeKw) {
    typeKw.forEach(k => tags.add(k));
  }
  tags.add(input.type.toLowerCase());

  // 6) School year
  if (input.year) {
    tags.add(input.year);
  }

  // 7) Trimestre
  if (input.trimester) {
    const trimNum = input.trimester.replace(/T/i, '').toLowerCase();
    tags.add(`trimestre-${trimNum}`);
  }

  // 8) Homework context
  if (input.homeworkSubtype) {
    tags.add(`devoir-${input.homeworkSubtype.toLowerCase()}`);
  }
  if (input.homeworkNumber) {
    tags.add(`n${input.homeworkNumber}`);
  }

  // 9) Has-correction flag
  if (input.hasCorrection) {
    tags.add('avec-corrige');
  }

  // Convert to array, dedupe, normalize, limit to 12
  const result = Array.from(tags)
    .map(normalize)
    .filter(Boolean)
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 12);

  return result;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Normalize string: lowercase, strip accents, alphanumeric+dash only */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[''`]/g, '-')           // apostrophes → dash
    .replace(/[^a-z0-9\s-]/g, ' ')    // remove special chars
    .replace(/\s+/g, '-')             // spaces → dash
    .replace(/-+/g, '-')              // collapse multiple dashes
    .replace(/^-|-$/g, '');           // trim dashes
}

/** Tokenize title into meaningful tags (filter stop words) */
function tokenizeTitle(title: string): string[] {
  const words = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .split(/[\s,;:!?()\/]+/)
    .filter(w => w.length >= 3)
    .filter(w => !STOP_WORDS_FR.has(w))
    .filter(w => !/^\d+$/.test(w)); // skip pure numbers

  return words.map(w => w.replace(/[''`]/g, ''));
}
