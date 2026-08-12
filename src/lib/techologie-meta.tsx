/**
 * Extract meta information for Technologie resources:
 * - System name (système étudié) - mandatory for DEVOIR/EXERCISE
 * - Specialty: Génie Mécanique (GM) or Génie Électrique (GE)
 * - Dossier technique presence
 *
 * Used in AiExerciseOverview card to display inline with " | " separators
 */

const TITLE_NOISE = [
  /^n°?\s*\d+\s*(er|eme|ème)?\s*$/i,
  /^(devoir|exercice|série|cours|contrôle|synth[èe]se)\s+(de\s+|n°?\s*\d+)/i,
  /^(technologie|techno|g[ée]nie)/i,
  /^(trim(estre)?)\s*\d+/i,
  /^(1ère?\s*ann[ée]e?\s+secondaire?\s*)/i,
  /^(2ème?\s*ann[ée]e?\s+secondaire?\s*)/i,
  /^(3ème?\s*ann[ée]e?\s+secondaire?\s*)/i,
  /^(4ème?\s*ann[ée]e?\s+secondaire?\s*(bac)?\s*)/i,
  /^(as|2018-2019|2019-2020|2020-2021|2021-2022|2022-2023|2023-2024|2024-2025|2025-2026)$/i,
  /^-?\s*$/,
];

const GM_KEYWORDS = [
  'liaison', 'cinématique', 'cotation', 'engrenage', 'poulie', 'courroie', 'bielle', 'came',
  'matériaux', 'rdm', 'contrainte', 'flexion', 'torsion', 'ajustement', 'tolérance',
  "classe d'équivalence", 'graphe des liaisons', 'fraisage', 'tournage', 'perçage',
  'projection orthogonale'
];

const GE_KEYWORDS = [
  'moteur asynchrone', 'mcc', 'moteur à courant', 'microcontrôleur', 'microcontroleur',
  'mikroc', 'pic 16f', 'a.l.i', 'amplificateur', 'comparateur', 'compteur', 'hacheur',
  'moteur pas-à-pas', 'logique combinatoire', 'logique séquentielle', 'monophasé',
  'triphasé', 'facteur de puissance', '74168', 'ci 74', 'circuit intégré'
];

function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

function isValidName(name: string): boolean {
  if (!name || name.length < 4 || name.length > 100) return false;
  for (const noise of TITLE_NOISE) {
    if (noise.test(name)) return false;
  }
  if (!/[a-zA-Zà-ÿÀ-Ÿ]{4,}/.test(name)) return false;
  return true;
}

/**
 * Extract system name from title.
 * Common patterns: "Machine de X", "Poste de X", "Station de X", "Système de X"
 */
export function extractSystemNameFromTitle(title: string): string | null {
  if (!title) return null;

  // Pattern 1: "Technologie: SYSTEME - CLASS"
  const p1 = title.match(/Technologie\s*[:]\s+([^-:]+?)(?:\s*-\s*(?:1AS|2AS|3AS|4AS|1ère|2ème|3ème|4ème|\d)|\s*$)/i);
  if (p1 && isValidName(p1[1])) return cleanName(p1[1]);

  // Pattern 2: "Machine/Poste/Station/Système/Unité de X"
  const systemRegex = /(Machine|Poste|Station|Système|Unité|Dispositif|Montage|Installation|Étau|Banc|Maillet|Presse|Pompe|Vérin|Mécanisme|Convoyeur|Robot)\s+(?:de\s+|d'\s*|d\s+)?([^-:]+?)(?:\s*[-:]\s*(?:\d|\(|$|1ère|2ème|3ème|4ème|1AS|2AS|3AS|4AS|Techno|Technologie|Maths|Mathématiques|Physique|SVT|Français|AR|Arabe|Anglais|Histoire|Géographie|Philo|Informatique|Économie|Sciences|Section|Trim|Profil)|\s*$)/i;
  const p2 = title.match(systemRegex);
  if (p2) {
    const name = (p2[1] + ' ' + p2[2]).trim();
    if (isValidName(name)) {
      if (name.length > 80) return cleanName(name.slice(0, 77) + '...');
      return cleanName(name);
    }
  }

  return null;
}

/**
 * Detect specialty (GM/GE) from title + content.
 */
export function detectSpecialty(title: string, text: string | null): 'GM' | 'GE' | null {
  const titleLower = (title || '').toLowerCase();
  const textLower = (text || '').toLowerCase();

  const gmCount = GM_KEYWORDS.filter(k => titleLower.includes(k) || textLower.includes(k)).length;
  const geCount = GE_KEYWORDS.filter(k => titleLower.includes(k) || textLower.includes(k)).length;

  if (gmCount > geCount && gmCount >= 2) return 'GM';
  if (geCount > gmCount && geCount >= 2) return 'GE';
  return null;
}

export interface TechMeta {
  label: string;
  icon: 'wrench' | 'cog' | 'zap' | 'book' | 'file' | 'flask' | 'atom';
  color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'slate';
}

/**
 * Build the meta array for the AiExerciseOverview card.
 * Order: system name (1st) > specialty (2nd) > dossier technique (3rd)
 */
export function buildTechMeta(
  systemName: string | null,
  specialty: 'GM' | 'GE' | null,
  hasDossier: boolean
): TechMeta[] {
  const meta: TechMeta[] = [];
  if (systemName) {
    meta.push({ label: systemName, icon: 'wrench', color: 'indigo' });
  }
  if (specialty === 'GM') {
    meta.push({ label: 'Génie Mécanique', icon: 'cog', color: 'slate' });
  } else if (specialty === 'GE') {
    meta.push({ label: 'Génie Électrique', icon: 'zap', color: 'amber' });
  }
  if (hasDossier) {
    meta.push({ label: 'Dossier technique', icon: 'file', color: 'sky' });
  }
  return meta;
}

/**
 * One-shot helper: build meta from a resource + content.
 * Uses title (regex) + text (specialty + dossier).
 */
export function getTechMeta(
  title: string,
  text: string | null,
  savedSystemName: string | null = null
): TechMeta[] {
  const systemName = savedSystemName || extractSystemNameFromTitle(title);
  const specialty = detectSpecialty(title, text);
  const hasDossier = text ? /dossier\s+technique/i.test(text) : false;
  return buildTechMeta(systemName, specialty, hasDossier);
}
