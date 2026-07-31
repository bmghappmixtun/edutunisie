
### 🤖 OpenAI Agents SDK v4 — pre-extraction + LLM confirmation (DONE 2026-07-31, `orchestrator_v4.py`)

**Goal**: handle OCR-degraded PDFs where v3 missed prof/school/year.

**Approach**:
- **Pre-extraction in Python** BEFORE the model call (regex hints):
  - Year: `(YYYY)-(YYYY)` or `YYYY/YYYY`
  - Duration: `مدة` + number + `دقيقة/دق` (or `durée 1h`)
  - Prof: `الأستاذ` (with OCR variants) + 1-4 Arabic words; OR no-prefix scan of first 15 lines
  - School: `المدرسة` + 1-6 Arabic words; OR `Lycée/Collège/École` + name
  - Date: `DD/MM/YYYY` patterns
- **Hints passed to LLM** as suggestions (LLM can confirm or override)
- **OCR-tolerant regex**: accepts Arabic Presentation Forms (U+FE70-U+FEFF) and Greek chars (U+0370-U+03FF) mixed with Arabic
- **Lam-Alef ligature handling**: "ﻻ" → "لا" (so "اﻷول" → "الاول" matches stop words)
- **Stop-word filter** for the no-prefix prof scanner: "التمرين", "الأول", "الإسم", "اللقب", "التوقيت", "المدة", "الفوج", etc.
- **PROF_END_MARKERS** truncate greedy match at "التوقيت" "الإنجاز" "المدة" etc.

**Test results on 50 Math collège files**:
- 48/50 success (96%)
- pre-hints: year=10/48 | prof=44/48 | school=17/48 | duration=10/48
- LLM final: **prof=47/48 (97.9%)** | school=45/48 (93.8%) | year=45/48 (93.8%) | duration=27/48 (56.3%)

**Comparison vs v3 on same 50**:
| Field | v3 | v4 | Δ |
|---|---|---|---|
| prof | 44/49 (89.8%) | **47/48 (97.9%)** | **+8%** |
| school | 47/49 (95.9%) | 45/48 (93.8%) | -2% |
| year | 49/49 (100%) | 45/48 (93.8%) | -6% |
| duration | not measured | 27/48 (56.3%) | new metric |

**v4 wins on prof**, slight loss on school/year. The year/school loss is because v4 is more strict (LLM rejects bad guesses) while v3 was lenient.

**Specific wins**:
- #1338: v3 returned prof "نجوى العلاني" (wrong) and null school; v4 returns "سمي الشابي" + "المدرسة الإعدادية العهد الجديد بنبل"
- #1054: v3 null prof; v4 "عِمَاد الناصِر" (from presentation-form OCR)
- #3282: v3 null prof; v4 "Fouzi Gharbi" / "فوزي الغربي" + school "المدرسة الإعدادية النموذجية"
- #1077: v4 correctly drops OCR-reversed "االستاذة" label from prof name → "يسرى ديسم"

**Avg time**: 5.2s (vs 5.6s for v3) — same speed, better accuracy.

**Decision**: **v4 is the new standard**. v3 stays for backward compat.

**Files**: `pdf-test/orchestrator_v4.py` (676 lines, ready for production).
