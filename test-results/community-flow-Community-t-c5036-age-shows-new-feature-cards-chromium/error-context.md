# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: community-flow.spec.ts >> Community teacher sharing >> home page shows new feature cards
- Location: tests/e2e/community-flow.spec.ts:64:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Bibliothèque personnelle').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Bibliothèque personnelle').first()

```

```yaml
- banner:
  - link "Examanet Examanet Plateforme pédagogique":
    - /url: /
    - img "Examanet"
    - text: Examanet Plateforme pédagogique
  - navigation:
    - link "Ressources":
      - /url: /ressources
    - link "Niveaux":
      - /url: /niveaux
    - link "Matières":
      - /url: /matieres
    - link "Professeurs":
      - /url: /professeurs
  - button "Rechercher":
    - img
  - img
  - textbox "Rechercher..."
  - button "FR → AR":
    - img
    - text: FR → AR
  - link "Connexion":
    - /url: /connexion
  - link "Inscription":
    - /url: /inscription
- main:
  - text: +143 ressources les plus
  - 'heading "La plateforme pédagogique #1 en Tunisie" [level=1]'
  - paragraph:
    - text: Cours, devoirs, séries, révisions, sujets bac et corrigés —
    - strong: 100% gratuits
    - text: pour les élèves du Primaire, Collège et Lycée.
  - img
  - textbox "Rechercher un cours, un devoir, une matière..."
  - button "Rechercher":
    - img
    - text: Rechercher
  - link "Maths":
    - /url: /matieres/maths
  - link "Physique":
    - /url: /matieres/physique
  - link "SVT":
    - /url: /matieres/svt
  - link "Français":
    - /url: /matieres/français
  - link "Arabe":
    - /url: /matieres/arabe
  - link "Anglais":
    - /url: /matieres/anglais
  - link "Explorer les ressources":
    - /url: /ressources
    - img
    - text: Explorer les ressources
  - link "Devenir enseignant":
    - /url: /inscription
    - img
    - text: Devenir enseignant
  - text: 📚 100% gratuit Toutes les ressources sont accessibles sans aucun frais.
  - img
  - text: Téléchargements 27.0k
  - img
  - text: Note moyenne 4.8/5
  - img
  - text: 143+ Ressources PDF
  - img
  - text: 12+ Enseignants
  - img
  - text: 46+ Élèves inscrits
  - img
  - text: 27.0k+ Téléchargements NIVEAUX
  - heading "Choisissez votre niveau" [level=2]
  - paragraph: Des ressources adaptées à chaque étape de votre parcours
  - link "🎒 Primaire De la 1ère à la 6ème année Explorer ce niveau":
    - /url: /niveaux/primaire
    - text: 🎒
    - heading "Primaire" [level=3]
    - paragraph: De la 1ère à la 6ème année
    - text: Explorer ce niveau
    - img
  - link "📖 Collège 7ème, 8ème et 9ème année de base Explorer ce niveau":
    - /url: /niveaux/college
    - text: 📖
    - heading "Collège" [level=3]
    - paragraph: 7ème, 8ème et 9ème année de base
    - text: Explorer ce niveau
    - img
  - link "🎓 Lycée & Baccalauréat De la 1ère année au Baccalauréat Explorer ce niveau":
    - /url: /niveaux/lycee
    - text: 🎓
    - heading "Lycée & Baccalauréat" [level=3]
    - paragraph: De la 1ère année au Baccalauréat
    - text: Explorer ce niveau
    - img
  - text: MATIÈRES
  - heading "Toutes les matières" [level=2]
  - paragraph: Plus de 20 matières couvertes par nos enseignants
  - link "Mathématiques":
    - /url: /matieres/mathematiques
    - img
    - text: Mathématiques
  - link "Physique":
    - /url: /matieres/physique
    - img
    - text: Physique
  - link "Sciences de la Vie et de la Terre":
    - /url: /matieres/svt
    - img
    - text: Sciences de la Vie et de la Terre
  - link "Français":
    - /url: /matieres/francais
    - img
    - text: Français
  - link "Arabe":
    - /url: /matieres/arabe
    - img
    - text: Arabe
  - link "Anglais":
    - /url: /matieres/anglais
    - img
    - text: Anglais
  - link "Histoire":
    - /url: /matieres/histoire
    - img
    - text: Histoire
  - link "Géographie":
    - /url: /matieres/geographie
    - img
    - text: Géographie
  - link "Philosophie":
    - /url: /matieres/philosophie
    - img
    - text: Philosophie
  - link "Économie":
    - /url: /matieres/economie
    - img
    - text: Économie
  - link "Gestion":
    - /url: /matieres/gestion
    - img
    - text: Gestion
  - link "Informatique":
    - /url: /matieres/informatique
    - img
    - text: Informatique
  - link "Technologie":
    - /url: /matieres/technologie
    - img
    - text: Technologie
  - link "Éducation Physique":
    - /url: /matieres/sport
    - img
    - text: Éducation Physique
  - link "Arts Plastiques":
    - /url: /matieres/arts
    - img
    - text: Arts Plastiques
  - link "Musique":
    - /url: /matieres/musique
    - img
    - text: Musique
  - text: RESSOURCES LES PLUS
  - heading "Ressources les plus consultées" [level=2]
  - paragraph: Les fichiers plébiscités par la communauté
  - link "Voir plus":
    - /url: /ressources
    - text: Voir plus
    - img
  - link "Cours complet — Électricité et Magnétisme Cours 3ème Cours complet — Électricité et Magnétisme Par Fatma Trabelsi 4.4 (32) 5.1k 2.0k 21":
    - /url: /ressources/cours-complet-electricite-et-magnetisme-vl0ff
    - img
    - text: Cours complet — Électricité et Magnétisme Cours 3ème
    - heading "Cours complet — Électricité et Magnétisme" [level=3]
    - paragraph: Par Fatma Trabelsi
    - img
    - img
    - img
    - img
    - img
    - text: 4.4 (32)
    - img
    - text: 5.1k
    - img
    - text: 2.0k
    - img
    - text: "21"
  - link "Histoire — Le monde contemporain Cours 3ème Histoire — Le monde contemporain Par Sarra Mansouri 4.9 (8) 5.0k 2.0k 23":
    - /url: /ressources/histoire-le-monde-contemporain-wbxss
    - img
    - text: Histoire — Le monde contemporain Cours 3ème
    - heading "Histoire — Le monde contemporain" [level=3]
    - paragraph: Par Sarra Mansouri
    - img
    - img
    - img
    - img
    - img
    - text: 4.9 (8)
    - img
    - text: 5.0k
    - img
    - text: 2.0k
    - img
    - text: "23"
  - link "Série d'exercices — Production écrite Série d'exercices 4ème Série d'exercices — Production écrite Par Leila Bouzid 4.1 (49) 4.6k 1.8k 16":
    - /url: /ressources/serie-d-exercices-production-ecrite-bw6nt
    - img
    - text: Série d'exercices — Production écrite Série d'exercices 4ème
    - heading "Série d'exercices — Production écrite" [level=3]
    - paragraph: Par Leila Bouzid
    - img
    - img
    - img
    - img
    - img
    - text: 4.1 (49)
    - img
    - text: 4.6k
    - img
    - text: 1.8k
    - img
    - text: "16"
  - link "Algorithmique et Python — TD1 Série d'exercices 2ème Algorithmique et Python — TD1 Par Youssef Daoud 3.6 (90) 4.6k 1.8k 13":
    - /url: /ressources/algorithmique-et-python-td1-ppqz7
    - img
    - text: Algorithmique et Python — TD1 Série d'exercices 2ème
    - heading "Algorithmique et Python — TD1" [level=3]
    - paragraph: Par Youssef Daoud
    - img
    - img
    - img
    - img
    - img
    - text: 3.6 (90)
    - img
    - text: 4.6k
    - img
    - text: 1.8k
    - img
    - text: "13"
  - link "Cours de Philosophie — La conscience Cours 3ème Cours de Philosophie — La conscience Par Sarra Mansouri 4.2 (43) 4.3k 1.7k 17":
    - /url: /ressources/cours-de-philosophie-la-conscience-hlzfm
    - img
    - text: Cours de Philosophie — La conscience Cours 3ème
    - heading "Cours de Philosophie — La conscience" [level=3]
    - paragraph: Par Sarra Mansouri
    - img
    - img
    - img
    - img
    - img
    - text: 4.2 (43)
    - img
    - text: 4.3k
    - img
    - text: 1.7k
    - img
    - text: "17"
  - link "Devoir surveillé — Mathématiques 9ème Contrôle/Examen 9ème Devoir surveillé — Mathématiques 9ème Par Amina Khelifi 4.1 (63) 4.0k 1.6k 0":
    - /url: /ressources/devoir-surveille-mathematiques-9eme-k3s7e
    - img
    - text: Devoir surveillé — Mathématiques 9ème Contrôle/Examen 9ème
    - heading "Devoir surveillé — Mathématiques 9ème" [level=3]
    - paragraph: Par Amina Khelifi
    - img
    - img
    - img
    - img
    - img
    - text: 4.1 (63)
    - img
    - text: 4.0k
    - img
    - text: 1.6k
    - img
    - text: "0"
  - link "English Bac Mock Exam 2024 Contrôle/Examen 4ème English Bac Mock Exam 2024 Par Karim Jendoubi 4.1 (56) 3.8k 1.5k 17":
    - /url: /ressources/english-bac-mock-exam-2024-td2aa
    - img
    - text: English Bac Mock Exam 2024 Contrôle/Examen 4ème
    - heading "English Bac Mock Exam 2024" [level=3]
    - paragraph: Par Karim Jendoubi
    - img
    - img
    - img
    - img
    - img
    - text: 4.1 (56)
    - img
    - text: 3.8k
    - img
    - text: 1.5k
    - img
    - text: "17"
  - link "Devoir de synthèse n°3 — Mathématiques Bac 2024 Devoir 4ème Devoir de synthèse n°3 — Mathématiques Bac 2024 Par Ahmed Ben Ali 3.9 (20) 3.7k 1.5k 14":
    - /url: /ressources/devoir-de-synthese-n-3-mathematiques-bac-2024-yvlgv
    - img
    - text: Devoir de synthèse n°3 — Mathématiques Bac 2024 Devoir 4ème
    - heading "Devoir de synthèse n°3 — Mathématiques Bac 2024" [level=3]
    - paragraph: Par Ahmed Ben Ali
    - img
    - img
    - img
    - img
    - img
    - text: 3.9 (20)
    - img
    - text: 3.7k
    - img
    - text: 1.5k
    - img
    - text: "14"
  - text: 🆕 PLUS RÉCENT
  - heading "Récemment ajoutés" [level=2]
  - paragraph: Les dernières ressources publiées
  - link "Voir plus":
    - /url: /ressources?sort=recent
    - text: Voir plus
    - img
  - link "Doc1.docx Cours 4ème Doc1.docx Par prof proton 0.0 (0) 8 0 0":
    - /url: /ressources/doc1-docx-ceExB
    - img
    - text: Doc1.docx Cours 4ème
    - heading "Doc1.docx" [level=3]
    - paragraph: Par prof proton
    - img
    - img
    - img
    - img
    - img
    - text: 0.0 (0)
    - img
    - text: "8"
    - img
    - text: "0"
    - img
    - text: "0"
  - link "Devoir de Contrôle N°1 - Math - 2ème Lettres (2025-2026) Mr OUERGHI CHOKRI Devoir 2ème Devoir de Contrôle N°1 - Math - 2ème Lettres (2025-2026) Mr OUERGHI CHOKRI Par prof proton 0.0 (0) 52 0 0":
    - /url: /ressources/devoir-de-contr-le-n-1-math-2-me-lettres-2025-2026-mr-ouerghi-chokri-mqmglo4w
    - img
    - text: Devoir de Contrôle N°1 - Math - 2ème Lettres (2025-2026) Mr OUERGHI CHOKRI Devoir 2ème
    - heading "Devoir de Contrôle N°1 - Math - 2ème Lettres (2025-2026) Mr OUERGHI CHOKRI" [level=3]
    - paragraph: Par prof proton
    - img
    - img
    - img
    - img
    - img
    - text: 0.0 (0)
    - img
    - text: "52"
    - img
    - text: "0"
    - img
    - text: "0"
  - link "E2E Approve Test 1781786445602 Cours 4ème E2E Approve Test 1781786445602 Par Ahmed Ben Ali 0.0 (0) 36 0 0":
    - /url: /ressources/e2e-approve-test-1781786445602-lvg5T
    - img
    - text: E2E Approve Test 1781786445602 Cours 4ème
    - heading "E2E Approve Test 1781786445602" [level=3]
    - paragraph: Par Ahmed Ben Ali
    - img
    - img
    - img
    - img
    - img
    - text: 0.0 (0)
    - img
    - text: "36"
    - img
    - text: "0"
    - img
    - text: "0"
  - link "E2E Approve Test 1781786145491 Cours 4ème E2E Approve Test 1781786145491 Par Ahmed Ben Ali 0.0 (0) 31 0 0":
    - /url: /ressources/e2e-approve-test-1781786145491-4tvFa
    - img
    - text: E2E Approve Test 1781786145491 Cours 4ème
    - heading "E2E Approve Test 1781786145491" [level=3]
    - paragraph: Par Ahmed Ben Ali
    - img
    - img
    - img
    - img
    - img
    - text: 0.0 (0)
    - img
    - text: "31"
    - img
    - text: "0"
    - img
    - text: "0"
  - link "E2E Self-Approve Test 1781776858733 Cours 4ème E2E Self-Approve Test 1781776858733 Par Ahmed Ben Ali 0.0 (0) 32 0 0":
    - /url: /ressources/e2e-self-approve-test-1781776858733-Gu37Q
    - img
    - text: E2E Self-Approve Test 1781776858733 Cours 4ème
    - heading "E2E Self-Approve Test 1781776858733" [level=3]
    - paragraph: Par Ahmed Ben Ali
    - img
    - img
    - img
    - img
    - img
    - text: 0.0 (0)
    - img
    - text: "32"
    - img
    - text: "0"
    - img
    - text: "0"
  - link "E2E Approve Test 1781776854945 Cours 4ème E2E Approve Test 1781776854945 Par Ahmed Ben Ali 0.0 (0) 29 0 0":
    - /url: /ressources/e2e-approve-test-1781776854945--uxG6
    - img
    - text: E2E Approve Test 1781776854945 Cours 4ème
    - heading "E2E Approve Test 1781776854945" [level=3]
    - paragraph: Par Ahmed Ben Ali
    - img
    - img
    - img
    - img
    - img
    - text: 0.0 (0)
    - img
    - text: "29"
    - img
    - text: "0"
    - img
    - text: "0"
  - link "E2E Self-Approve Test 1781775865075 Cours 4ème E2E Self-Approve Test 1781775865075 Par Ahmed Ben Ali 0.0 (0) 32 0 0":
    - /url: /ressources/e2e-self-approve-test-1781775865075-cZ8H0
    - img
    - text: E2E Self-Approve Test 1781775865075 Cours 4ème
    - heading "E2E Self-Approve Test 1781775865075" [level=3]
    - paragraph: Par Ahmed Ben Ali
    - img
    - img
    - img
    - img
    - img
    - text: 0.0 (0)
    - img
    - text: "32"
    - img
    - text: "0"
    - img
    - text: "0"
  - link "E2E Approve Test 1781775861107 Cours 4ème E2E Approve Test 1781775861107 Par Ahmed Ben Ali 0.0 (0) 27 0 0":
    - /url: /ressources/e2e-approve-test-1781775861107-m5Ijs
    - img
    - text: E2E Approve Test 1781775861107 Cours 4ème
    - heading "E2E Approve Test 1781775861107" [level=3]
    - paragraph: Par Ahmed Ben Ali
    - img
    - img
    - img
    - img
    - img
    - text: 0.0 (0)
    - img
    - text: "27"
    - img
    - text: "0"
    - img
    - text: "0"
  - text: SIMPLE COMME
  - heading "Simple comme 1, 2, 3" [level=2]
  - paragraph: Trouvez vos ressources en quelques clics
  - text: 👨‍🎓 ÉLÈVE
  - heading "Simple comme" [level=3]
  - text: "1"
  - heading "Parcourez" [level=4]
  - paragraph: Explorez +10 000 ressources par niveau, matière ou enseignant.
  - text: "2"
  - heading "Téléchargez" [level=4]
  - paragraph: PDF gratuits, accès direct, sans inscription obligatoire.
  - text: "3"
  - heading "Progressez" [level=4]
  - paragraph: Évaluez, commentez et sauvegardez vos ressources préférées.
  - text: 👨‍🏫 ENSEIGNANT
  - heading "Devenir enseignant" [level=3]
  - text: "1"
  - heading "Créer mon compte" [level=4]
  - paragraph: Explorez +10 000 ressources par niveau, matière ou enseignant.
  - text: "2"
  - heading "Fichier PDF" [level=4]
  - paragraph: Votre ressource sera examinée par l'administrateur avant publication.
  - text: "3"
  - heading "Analytique" [level=4]
  - paragraph: Note moyenne
  - link "Devenir enseignant":
    - /url: /inscription
    - text: Devenir enseignant
    - img
  - text: UNE PLATEFORME
  - heading "Une plateforme pensée pour vous" [level=2]
  - img
  - heading "100% gratuit" [level=3]
  - paragraph: Toutes les ressources sont accessibles sans aucun frais.
  - img
  - heading "Qualité validée" [level=3]
  - paragraph: Chaque PDF est vérifié par notre équipe avant publication.
  - img
  - heading "Aperçu du document" [level=3]
  - paragraph: Lire en ligne
  - img
  - heading "Imprimer" [level=3]
  - paragraph: Téléchargement lancé
  - img
  - heading "Partager" [level=3]
  - paragraph: Lien copié !
  - img
  - heading "Mobile-friendly" [level=3]
  - paragraph: Téléchargements et lecture optimisés sur tous les appareils.
  - img
  - text: PARTAGEZ VOTRE SAVOIR AVEC
  - heading "Partagez votre savoir avec +46 élèves inscrits" [level=2]
  - paragraph: Rejoignez +200 enseignants qui partagent déjà leurs ressources avec la communauté EduTunisie.
  - link "Devenir enseignant":
    - /url: /inscription
    - img
    - text: Devenir enseignant
  - link "Professeurs":
    - /url: /professeurs
    - text: Professeurs
    - img
  - img
  - heading "Restez informé" [level=2]
  - paragraph: Recevez chaque semaine les meilleures ressources, nouveaux sujets de bac et corrigés.
  - textbox "votre.email@exemple.com"
  - button "S'abonner"
  - paragraph: 🔒 Annuler Confirmer
- contentinfo:
  - link "Examanet Plateforme pédagogique":
    - /url: /
    - img
    - text: Examanet Plateforme pédagogique
  - paragraph: Conçu avec ❤️ en Tunisie 🇹🇳 pour les élèves tunisiens
  - link:
    - /url: "#"
    - img
  - link:
    - /url: "#"
    - img
  - link:
    - /url: "#"
    - img
  - link:
    - /url: "#"
    - img
  - heading "Navigation" [level=4]
  - list:
    - listitem:
      - link "Accueil":
        - /url: /
    - listitem:
      - link "Ressources":
        - /url: /ressources
    - listitem:
      - link "Niveaux":
        - /url: /niveaux
    - listitem:
      - link "Matières":
        - /url: /matieres
    - listitem:
      - link "Professeurs":
        - /url: /professeurs
  - heading "Ressources" [level=4]
  - list:
    - listitem:
      - link "Type":
        - /url: /ressources?type=COURSE
    - listitem:
      - link "Devoirs":
        - /url: /ressources?type=HOMEWORK
    - listitem:
      - link "Sujets Bac":
        - /url: /ressources?type=BAC_SUBJECT
    - listitem:
      - link "Corrigés":
        - /url: /ressources?type=CORRECTION
  - heading "À propos" [level=4]
  - list:
    - listitem:
      - link "CGU":
        - /url: /cgu
    - listitem:
      - link "À propos":
        - /url: /a-propos
    - listitem:
      - link "Contact":
        - /url: /contact
  - paragraph: © 2026 EduTunisie. Tous droits réservés.
  - paragraph: Conçu avec ❤️ en Tunisie 🇹🇳 pour les élèves tunisiens
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Community teacher sharing', () => {
  4  |   test('student does NOT see Original download button', async ({ page }) => {
  5  |     // Login as student
  6  |     await page.goto('/connexion');
  7  |     await page.fill('input[type="email"]', 'yassine@example.com');
  8  |     await page.fill('input[type="password"]', 'demo1234');
  9  |     await page.click('button[type="submit"]');
  10 |     await page.waitForURL(/mon-compte|eleve|student|profil/, { timeout: 15000 });
  11 | 
  12 |     // Go to any resource
  13 |     await page.goto('/ressources');
  14 |     const firstResource = page.locator('a[href^="/ressources/"]').first();
  15 |     await firstResource.click();
  16 |     await page.waitForLoadState('networkidle');
  17 | 
  18 |     // Look for Original button (should NOT exist for students)
  19 |     const originalBtn = page.locator('button:has-text("Original")');
  20 |     const count = await originalBtn.count();
  21 |     console.log(`Student sees ${count} Original buttons (should be 0)`);
  22 |     expect(count).toBe(0);
  23 | 
  24 |     await page.screenshot({ path: 'tests/e2e/screenshots/student-no-original.png', fullPage: true });
  25 |   });
  26 | 
  27 |   test('teacher sees Original download button + community page', async ({ page }) => {
  28 |     // Login as teacher
  29 |     await page.goto('/connexion');
  30 |     await page.fill('input[type="email"]', 'ahmed.benali@edutunisie.tn');
  31 |     await page.fill('input[type="password"]', 'demo1234');
  32 |     await page.click('button[type="submit"]');
  33 |     await page.waitForURL(/mon-compte|enseignant/, { timeout: 15000 });
  34 | 
  35 |     // Go to community page
  36 |     await page.goto('/enseignant/communaute');
  37 |     await expect(page.locator('h1:has-text("Communauté")')).toBeVisible({ timeout: 5000 });
  38 |     await page.screenshot({ path: 'tests/e2e/screenshots/teacher-community.png', fullPage: true });
  39 | 
  40 |     // Should show hero stats
  41 |     await expect(page.locator('text=fichiers partagés')).toBeVisible();
  42 |     await expect(page.locator('text=enseignants actifs')).toBeVisible();
  43 |   });
  44 | 
  45 |   test('inscription page shows teacher motivation banner', async ({ page }) => {
  46 |     await page.goto('/inscription');
  47 | 
  48 |     // Click on teacher option
  49 |     await page.click('button:has-text("Enseignant")');
  50 | 
  51 |     // Should show motivation banner
  52 |     await expect(page.locator('text=Rejoignez la communauté des enseignants')).toBeVisible({ timeout: 3000 });
  53 |     await expect(page.locator('text=Bibliothèque personnelle')).toBeVisible();
  54 |     await expect(page.locator('text=Conversion Word → PDF')).toBeVisible();
  55 |     await expect(page.locator('text=Communauté unique en Tunisie')).toBeVisible();
  56 |     await page.screenshot({ path: 'tests/e2e/screenshots/inscription-teacher.png', fullPage: true });
  57 | 
  58 |     // Click on student option
  59 |     await page.click('button:has-text("Élève")');
  60 |     await expect(page.locator('text=milliers de ressources gratuites')).toBeVisible();
  61 |     await page.screenshot({ path: 'tests/e2e/screenshots/inscription-student.png', fullPage: true });
  62 |   });
  63 | 
  64 |   test('home page shows new feature cards', async ({ page }) => {
  65 |     await page.goto('/');
  66 |     await page.waitForLoadState('networkidle');
  67 | 
  68 |     // Should show new feature cards
> 69 |     await expect(page.locator('text=Bibliothèque personnelle').first()).toBeVisible({ timeout: 5000 });
     |                                                                         ^ Error: expect(locator).toBeVisible() failed
  70 |     await expect(page.locator('text=Conversion Word → PDF').first()).toBeVisible();
  71 |     await expect(page.locator('text=Communauté enseignants').first()).toBeVisible();
  72 |     await page.screenshot({ path: 'tests/e2e/screenshots/home-features.png', fullPage: true });
  73 |   });
  74 | });
```