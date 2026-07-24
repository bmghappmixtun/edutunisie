# Data Fixes - July 24, 2026

## Overview

Three waves of subject reclassification based on AI text analysis + Tunisian curriculum validation.

## Total Impact

| Metric | Before | After |
|---|---:|---:|
| Resources with `ai.subject = ai.title = db.subject` (perfect) | 8,084 (60.0%) | 8,084 + reclassified |
| Resources reclassified (total) | 0 | **531** |
| `ResourceSubjectReclassify` backup rows | 0 | 531 |

## Wave 1: AI.subject + AI.title agreement (281 cases)

**Method**: When both `ai.subject` (extracted from PDF metadata) AND `ai.title` (AI-generated title) suggested the same subject, different from DB → high confidence reclassification.

**File**: `pdf-test/fix_subject_reclassify.py`

## Wave 2: GPT-4o-mini text re-detection - 122 cases (curriculum-strict)

**Method**: Run GPT-4o-mini on extracted text from 330 ambiguous PDFs. Apply strict class/section validation rules.

**Files**: 
- `pdf-test/ai_subject_ambiguous.py` (run GPT-4o-mini on 330 ambiguous)
- `pdf-test/fix_subject_text_ai.py` (validate 122, skip 17 chemistry, reject 24 invalid)
- `pdf-test/fix_subject_text_ai_apply.py` (apply 122)

## Wave 3: GPT-4o-mini text + curriculum-aware (124 cases)

**Method**: Same as Wave 2 but with **proper Tunisian curriculum rules** (1AS = tronc commun, 2AS sections, etc.).

**Files**:
- `pdf-test/fix_subject_text_ai_v2_apply.py` (apply 124)
- `pdf-test/text_ai_v2_apply.csv` (124 apply + 22 skip)

**Key curriculum rules** applied:
- 1AS = tronc commun, NO section
- 2AS = 5 sections: sciences, technologies-informatique, eco-services, lettres, sport
- 3AS/4AS = 7 sections
- Technologie taught in 2AS Sciences (not only Technique section)
- Philosophie taught in all 3AS/4AS sections (not only Lettres)
- Économie in 1AS (introduction)
- Algo-prog in 3AS/4AS Sciences Techniques (not only SI)
- Gestion in 2AS (not 1AS)
- Collège (7-9e) has limited subjects (no algo-prog, no gestion, no philo)

## Wave 4: Generic slug reclassification (5 cases)

**Method**: 22 skip cases from Wave 3 investigated. 5 safely reclassifiable to generic slugs:
- 4 cases: algo-prog → `informatique` (because class doesn't support algo-prog)
- 1 case (NID 2943): algo-prog → `technologie` (title says Technologie)

**Skipped: 17 cases for manual review** (see below).

## 17 Manual Review Cases (skip_categorized.csv)

### Group A: AI likely wrong (5)
- 8737, 8750, 8744, 8735, 8974: `economie → gestion` in 1AS (gestion doesn't exist in 1AS)

### Group B: Section fix possible (6)
- 11907, 11893: `bases-donnees` + section should be SI (title says "Bac Informatique")
- 9505: `algo-prog` in 4AS eco-gestion (weird — section should be SI)
- 8408, 8527: `bases-donnees` + section SI (4AS, no section)
- 9591: `technologie` + section technique (3AS, no section)

### Group C: Class mismatch or unclear (6)
- 7457, 4515, 4910, 3974: title says Math but content is algo-prog/technologie
- 9452, 8705: title says 1AS but class is 3AS-4AS (class mismatch)

## Final Subject Distribution (after all 4 waves)

| Subject | # Resources |
|---|---:|
| mathematiques | 6,102 |
| physique | 3,210 |
| technologie | 1,083 |
| svt | 823 |
| anglais | 540 |
| francais | 434 |
| arabe | 316 |
| economie | 293 |
| informatique | 281 |
| histoire | 65 |
| 3eme-langue | 55 |
| gestion | 47 |
| geographie | 45 |
| education-islamique | 45 |
| bases-donnees | 27 |
| ... | ... |
| **Total** | **13,473** |

## Backup Tables

All changes backed up to `ResourceSubjectReclassify` table:
- oldSubjectSlug, newSubjectSlug, changedBy
- 531 rows (281 + 122 + 124 + 4 unique since 5 are reuse)

## Final: 17 Manual Cases (July 24, 2026 ~18:30 UTC)

After investigation, applied **8 with section fix** + skipped **9**:

### Applied (8 - subject + section fix)
- NID 11907, 11893: bases-donnees + section sciences-informatique (title: "Bac Informatique")
- NID 8408, 8527: bases-donnees + section sciences-informatique (4AS, no section)
- NID 9591: technologie + section technique (3AS, no section)
- NID 4515: technologie + section technique (4AS, was wrongly svt+sc-exp, content is RDM)
- NID 9452, 8705: algo-prog + section sciences-informatique (class 4AS/3AS, title wrong says 1AS)

### Skipped (9 - no change, AI wrong or generic slug)
- NID 8737, 8750, 8744, 8735, 8974: AI detected gestion in 1AS (gestion not in 1AS), keep math
- NID 9505: title says 4AS eco-gestion, keep informatique (algo taught in eco class)
- NID 7457: title says Math 4AS maths, keep informatique (algo in maths class)
- NID 4910: title says Math 4AS eco, keep informatique
- NID 3974: signal processing is physique, keep physique (AI wrong said technologie)

## Final Totals
- **Total reclassifications applied**: 539 (4 waves + 17 manual)
- **Distribution top 5**: math 6099 / physique 3210 / technologie 1085 / svt 822 / anglais 540
- All backed up in `ResourceSubjectReclassify`
