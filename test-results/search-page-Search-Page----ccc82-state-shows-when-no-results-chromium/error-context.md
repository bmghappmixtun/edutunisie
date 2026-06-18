# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: search-page.spec.ts >> Search Page - Complete E2E >> 14. Empty state shows when no results
- Location: tests/e2e/search-page.spec.ts:253:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e5]:
        - link "EduTunisie Plateforme pédagogique" [ref=e7] [cursor=pointer]:
          - /url: /
          - img [ref=e9]
          - generic [ref=e12]:
            - generic [ref=e13]: EduTunisie
            - generic [ref=e14]: Plateforme pédagogique
        - navigation [ref=e15]:
          - link "Ressources" [ref=e16] [cursor=pointer]:
            - /url: /ressources
          - link "Niveaux" [ref=e17] [cursor=pointer]:
            - /url: /niveaux
          - link "Matières" [ref=e18] [cursor=pointer]:
            - /url: /matieres
          - link "Professeurs" [ref=e19] [cursor=pointer]:
            - /url: /professeurs
        - generic [ref=e20]:
          - generic [ref=e21]:
            - button "Rechercher" [ref=e22] [cursor=pointer]:
              - img [ref=e23]
            - generic:
              - generic:
                - generic:
                  - generic:
                    - img
                    - textbox "Rechercher..."
          - button "FR → AR" [ref=e26] [cursor=pointer]:
            - img [ref=e27]
            - generic [ref=e30]: FR
            - generic [ref=e31]: → AR
          - link "Connexion" [ref=e32] [cursor=pointer]:
            - /url: /connexion
          - link "Inscription" [ref=e33] [cursor=pointer]:
            - /url: /inscription
    - generic [ref=e40]:
      - img [ref=e41]
      - textbox "Rechercher..." [ref=e44]: zzzzzzzznonexistent12345
      - button [ref=e45] [cursor=pointer]:
        - img [ref=e46]
    - main [ref=e49]:
      - generic [ref=e50]:
        - generic [ref=e51]:
          - generic [ref=e52]:
            - heading "Résultats pour \"zzzzzzzznonexistent12345\"" [level=1] [ref=e53]:
              - text: Résultats pour
              - generic [ref=e54]: "\"zzzzzzzznonexistent12345\""
            - paragraph [ref=e55]: 141 ressources
          - generic [ref=e56]:
            - combobox [ref=e57]:
              - option "Pertinence" [selected]
              - option "Plus récent"
              - option "Plus vus"
              - option "Plus téléchargés"
            - generic [ref=e58]:
              - button "Grille" [ref=e59] [cursor=pointer]:
                - img [ref=e60]
              - button "Liste" [ref=e62] [cursor=pointer]:
                - img [ref=e63]
        - generic [ref=e64]:
          - complementary [ref=e65]:
            - generic [ref=e66]:
              - button "📄 Type" [ref=e67] [cursor=pointer]:
                - generic [ref=e68]:
                  - generic [ref=e69]: 📄
                  - text: Type
                - img [ref=e70]
              - generic [ref=e72]:
                - button "Tous les types 141" [ref=e73] [cursor=pointer]:
                  - generic [ref=e74]: Tous les types
                  - generic [ref=e75]: "141"
                - button "📖 Cours 48" [ref=e76] [cursor=pointer]:
                  - generic [ref=e77]: 📖
                  - generic [ref=e78]: Cours
                  - generic [ref=e79]: "48"
                - button "📝 Devoir 78" [ref=e80] [cursor=pointer]:
                  - generic [ref=e81]: 📝
                  - generic [ref=e82]: Devoir
                  - generic [ref=e83]: "78"
                - button "✏️ Exercice 4" [ref=e84] [cursor=pointer]:
                  - generic [ref=e85]: ✏️
                  - generic [ref=e86]: Exercice
                  - generic [ref=e87]: "4"
                - button "📚 Série 0" [ref=e88] [cursor=pointer]:
                  - generic [ref=e89]: 📚
                  - generic [ref=e90]: Série
                  - generic [ref=e91]: "0"
                - button "🎓 Sujet Bac 2" [ref=e92] [cursor=pointer]:
                  - generic [ref=e93]: 🎓
                  - generic [ref=e94]: Sujet Bac
                  - generic [ref=e95]: "2"
                - button "✅ Corrigé 1" [ref=e96] [cursor=pointer]:
                  - generic [ref=e97]: ✅
                  - generic [ref=e98]: Corrigé
                  - generic [ref=e99]: "1"
                - button "📄 Résumé 2" [ref=e100] [cursor=pointer]:
                  - generic [ref=e101]: 📄
                  - generic [ref=e102]: Résumé
                  - generic [ref=e103]: "2"
                - button "🗂️ Fiche 0" [ref=e104] [cursor=pointer]:
                  - generic [ref=e105]: 🗂️
                  - generic [ref=e106]: Fiche
                  - generic [ref=e107]: "0"
            - generic [ref=e108]:
              - button "📚 Matière" [ref=e109] [cursor=pointer]:
                - generic [ref=e110]:
                  - generic [ref=e111]: 📚
                  - text: Matière
                - img [ref=e112]
              - generic [ref=e114]:
                - button "Toutes les matières 141" [ref=e115] [cursor=pointer]:
                  - generic [ref=e116]: Toutes les matières
                  - generic [ref=e117]: "141"
                - button "Mathématiques 121" [ref=e118] [cursor=pointer]:
                  - generic [ref=e119]: Mathématiques
                  - generic [ref=e120]: "121"
                - button "Physique 3" [ref=e121] [cursor=pointer]:
                  - generic [ref=e122]: Physique
                  - generic [ref=e123]: "3"
                - button "Sciences de la Vie et de la Terre 3" [ref=e124] [cursor=pointer]:
                  - generic [ref=e125]: Sciences de la Vie et de la Terre
                  - generic [ref=e126]: "3"
                - button "Français 1" [ref=e127] [cursor=pointer]:
                  - generic [ref=e128]: Français
                  - generic [ref=e129]: "1"
                - button "Arabe 2" [ref=e130] [cursor=pointer]:
                  - generic [ref=e131]: Arabe
                  - generic [ref=e132]: "2"
                - button "Anglais 2" [ref=e133] [cursor=pointer]:
                  - generic [ref=e134]: Anglais
                  - generic [ref=e135]: "2"
                - button "Histoire 1" [ref=e136] [cursor=pointer]:
                  - generic [ref=e137]: Histoire
                  - generic [ref=e138]: "1"
                - button "Géographie 1" [ref=e139] [cursor=pointer]:
                  - generic [ref=e140]: Géographie
                  - generic [ref=e141]: "1"
                - button "Philosophie 2" [ref=e142] [cursor=pointer]:
                  - generic [ref=e143]: Philosophie
                  - generic [ref=e144]: "2"
                - button "Économie 1" [ref=e145] [cursor=pointer]:
                  - generic [ref=e146]: Économie
                  - generic [ref=e147]: "1"
                - button "Informatique 2" [ref=e148] [cursor=pointer]:
                  - generic [ref=e149]: Informatique
                  - generic [ref=e150]: "2"
                - button "Technologie 2" [ref=e151] [cursor=pointer]:
                  - generic [ref=e152]: Technologie
                  - generic [ref=e153]: "2"
            - generic [ref=e154]:
              - button "🎒 Classe" [ref=e155] [cursor=pointer]:
                - generic [ref=e156]:
                  - generic [ref=e157]: 🎒
                  - text: Classe
                - img [ref=e158]
              - generic [ref=e160]:
                - button "Toutes les classes 141" [ref=e161] [cursor=pointer]:
                  - generic [ref=e162]: Toutes les classes
                  - generic [ref=e163]: "141"
                - button "7ème année de base 30" [ref=e164] [cursor=pointer]:
                  - generic [ref=e165]: 7ème année de base
                  - generic [ref=e166]: "30"
                - button "1ère année secondaire 3" [ref=e167] [cursor=pointer]:
                  - generic [ref=e168]: 1ère année secondaire
                  - generic [ref=e169]: "3"
                - button "2ème année secondaire 2" [ref=e170] [cursor=pointer]:
                  - generic [ref=e171]: 2ème année secondaire
                  - generic [ref=e172]: "2"
                - button "8ème année de base 21" [ref=e173] [cursor=pointer]:
                  - generic [ref=e174]: 8ème année de base
                  - generic [ref=e175]: "21"
                - button "3ème année secondaire 6" [ref=e176] [cursor=pointer]:
                  - generic [ref=e177]: 3ème année secondaire
                  - generic [ref=e178]: "6"
                - button "9ème année de base 26" [ref=e179] [cursor=pointer]:
                  - generic [ref=e180]: 9ème année de base
                  - generic [ref=e181]: "26"
                - button "4ème année secondaire (Bac) 53" [ref=e182] [cursor=pointer]:
                  - generic [ref=e183]: 4ème année secondaire (Bac)
                  - generic [ref=e184]: "53"
            - generic [ref=e185]:
              - button "👨‍🏫 Enseignant" [ref=e186] [cursor=pointer]:
                - generic [ref=e187]:
                  - generic [ref=e188]: 👨‍🏫
                  - text: Enseignant
                - img [ref=e189]
              - generic [ref=e191]:
                - button "Tous les enseignants 141" [ref=e192] [cursor=pointer]:
                  - generic [ref=e193]: Tous les enseignants
                  - generic [ref=e194]: "141"
                - button "Fatma Trabelsi 3" [ref=e195] [cursor=pointer]:
                  - generic [ref=e196]: Fatma Trabelsi
                  - generic [ref=e197]: "3"
                - button "Mohamed Gharbi 3" [ref=e198] [cursor=pointer]:
                  - generic [ref=e199]: Mohamed Gharbi
                  - generic [ref=e200]: "3"
                - button "Ahmed Ben Ali 46" [ref=e201] [cursor=pointer]:
                  - generic [ref=e202]: Ahmed Ben Ali
                  - generic [ref=e203]: "46"
                - button "Leila Bouzid 3" [ref=e204] [cursor=pointer]:
                  - generic [ref=e205]: Leila Bouzid
                  - generic [ref=e206]: "3"
                - button "Youssef Daoud 3" [ref=e207] [cursor=pointer]:
                  - generic [ref=e208]: Youssef Daoud
                  - generic [ref=e209]: "3"
                - button "Karim Jendoubi 2" [ref=e210] [cursor=pointer]:
                  - generic [ref=e211]: Karim Jendoubi
                  - generic [ref=e212]: "2"
                - button "Sarra Mansouri 5" [ref=e213] [cursor=pointer]:
                  - generic [ref=e214]: Sarra Mansouri
                  - generic [ref=e215]: "5"
                - button "Amina Khelifi 1" [ref=e216] [cursor=pointer]:
                  - generic [ref=e217]: Amina Khelifi
                  - generic [ref=e218]: "1"
                - button "Ridha Gharbi 75" [ref=e219] [cursor=pointer]:
                  - generic [ref=e220]: Ridha Gharbi
                  - generic [ref=e221]: "75"
            - generic [ref=e222]:
              - button "📅 Année scolaire" [ref=e223] [cursor=pointer]:
                - generic [ref=e224]:
                  - generic [ref=e225]: 📅
                  - text: Année scolaire
                - img [ref=e226]
              - generic [ref=e228]:
                - button "Toutes 141" [ref=e229] [cursor=pointer]:
                  - generic [ref=e230]: Toutes
                  - generic [ref=e231]: "141"
                - button "NaN-2025-2026 11" [ref=e232] [cursor=pointer]:
                  - generic [ref=e233]: NaN-2025-2026
                  - generic [ref=e234]: "11"
                - button "NaN-2024-2025 12" [ref=e235] [cursor=pointer]:
                  - generic [ref=e236]: NaN-2024-2025
                  - generic [ref=e237]: "12"
                - button "NaN-2023-2024 63" [ref=e238] [cursor=pointer]:
                  - generic [ref=e239]: NaN-2023-2024
                  - generic [ref=e240]: "63"
                - button "NaN-2022-2023 20" [ref=e241] [cursor=pointer]:
                  - generic [ref=e242]: NaN-2022-2023
                  - generic [ref=e243]: "20"
                - button "NaN-2021-2022 13" [ref=e244] [cursor=pointer]:
                  - generic [ref=e245]: NaN-2021-2022
                  - generic [ref=e246]: "13"
                - button "NaN-2020-2021 6" [ref=e247] [cursor=pointer]:
                  - generic [ref=e248]: NaN-2020-2021
                  - generic [ref=e249]: "6"
          - generic [ref=e250]:
            - generic [ref=e251]:
              - link "📖 Cours NaN-2023-2024 E2E Approve Test 1781786445602 Resource to test admin approval Mathématiques 🎒 4ème année secondaire (Bac) Ahmed B. 3 0" [ref=e252] [cursor=pointer]:
                - /url: /ressources/e2e-approve-test-1781786445602-lvg5T
                - generic [ref=e253]:
                  - generic [ref=e254]:
                    - generic [ref=e255]: 📖 Cours
                    - generic [ref=e256]: NaN-2023-2024
                  - heading "E2E Approve Test 1781786445602" [level=3] [ref=e257]
                  - paragraph [ref=e258]: Resource to test admin approval
                  - generic [ref=e259]:
                    - generic [ref=e260]:
                      - img [ref=e261]
                      - text: Mathématiques
                    - generic [ref=e264]:
                      - generic [ref=e265]: 🎒
                      - text: 4ème année secondaire (Bac)
                  - generic [ref=e266]:
                    - generic [ref=e267]:
                      - img [ref=e268]
                      - text: Ahmed B.
                    - generic [ref=e271]:
                      - generic [ref=e272]:
                        - img [ref=e273]
                        - text: "3"
                      - generic [ref=e276]:
                        - img [ref=e277]
                        - text: "0"
              - link "📖 Cours NaN-2023-2024 E2E Approve Test 1781786145491 Resource to test admin approval Mathématiques 🎒 4ème année secondaire (Bac) Ahmed B. 1 0" [ref=e280] [cursor=pointer]:
                - /url: /ressources/e2e-approve-test-1781786145491-4tvFa
                - generic [ref=e281]:
                  - generic [ref=e282]:
                    - generic [ref=e283]: 📖 Cours
                    - generic [ref=e284]: NaN-2023-2024
                  - heading "E2E Approve Test 1781786145491" [level=3] [ref=e285]
                  - paragraph [ref=e286]: Resource to test admin approval
                  - generic [ref=e287]:
                    - generic [ref=e288]:
                      - img [ref=e289]
                      - text: Mathématiques
                    - generic [ref=e292]:
                      - generic [ref=e293]: 🎒
                      - text: 4ème année secondaire (Bac)
                  - generic [ref=e294]:
                    - generic [ref=e295]:
                      - img [ref=e296]
                      - text: Ahmed B.
                    - generic [ref=e299]:
                      - generic [ref=e300]:
                        - img [ref=e301]
                        - text: "1"
                      - generic [ref=e304]:
                        - img [ref=e305]
                        - text: "0"
              - link "📖 Cours E2E Self-Approve Test 1781776858733 Mathématiques 🎒 4ème année secondaire (Bac) Ahmed B. 2 0" [ref=e308] [cursor=pointer]:
                - /url: /ressources/e2e-self-approve-test-1781776858733-Gu37Q
                - generic [ref=e309]:
                  - generic [ref=e311]: 📖 Cours
                  - heading "E2E Self-Approve Test 1781776858733" [level=3] [ref=e312]
                  - generic [ref=e313]:
                    - generic [ref=e314]:
                      - img [ref=e315]
                      - text: Mathématiques
                    - generic [ref=e318]:
                      - generic [ref=e319]: 🎒
                      - text: 4ème année secondaire (Bac)
                  - generic [ref=e320]:
                    - generic [ref=e321]:
                      - img [ref=e322]
                      - text: Ahmed B.
                    - generic [ref=e325]:
                      - generic [ref=e326]:
                        - img [ref=e327]
                        - text: "2"
                      - generic [ref=e330]:
                        - img [ref=e331]
                        - text: "0"
              - link "📖 Cours NaN-2023-2024 E2E Approve Test 1781776854945 Resource to test admin approval Mathématiques 🎒 4ème année secondaire (Bac) Ahmed B. 1 0" [ref=e334] [cursor=pointer]:
                - /url: /ressources/e2e-approve-test-1781776854945--uxG6
                - generic [ref=e335]:
                  - generic [ref=e336]:
                    - generic [ref=e337]: 📖 Cours
                    - generic [ref=e338]: NaN-2023-2024
                  - heading "E2E Approve Test 1781776854945" [level=3] [ref=e339]
                  - paragraph [ref=e340]: Resource to test admin approval
                  - generic [ref=e341]:
                    - generic [ref=e342]:
                      - img [ref=e343]
                      - text: Mathématiques
                    - generic [ref=e346]:
                      - generic [ref=e347]: 🎒
                      - text: 4ème année secondaire (Bac)
                  - generic [ref=e348]:
                    - generic [ref=e349]:
                      - img [ref=e350]
                      - text: Ahmed B.
                    - generic [ref=e353]:
                      - generic [ref=e354]:
                        - img [ref=e355]
                        - text: "1"
                      - generic [ref=e358]:
                        - img [ref=e359]
                        - text: "0"
              - link "📖 Cours E2E Self-Approve Test 1781775865075 Mathématiques 🎒 4ème année secondaire (Bac) Ahmed B. 2 0" [ref=e362] [cursor=pointer]:
                - /url: /ressources/e2e-self-approve-test-1781775865075-cZ8H0
                - generic [ref=e363]:
                  - generic [ref=e365]: 📖 Cours
                  - heading "E2E Self-Approve Test 1781775865075" [level=3] [ref=e366]
                  - generic [ref=e367]:
                    - generic [ref=e368]:
                      - img [ref=e369]
                      - text: Mathématiques
                    - generic [ref=e372]:
                      - generic [ref=e373]: 🎒
                      - text: 4ème année secondaire (Bac)
                  - generic [ref=e374]:
                    - generic [ref=e375]:
                      - img [ref=e376]
                      - text: Ahmed B.
                    - generic [ref=e379]:
                      - generic [ref=e380]:
                        - img [ref=e381]
                        - text: "2"
                      - generic [ref=e384]:
                        - img [ref=e385]
                        - text: "0"
              - link "📖 Cours NaN-2023-2024 E2E Approve Test 1781775861107 Resource to test admin approval Mathématiques 🎒 4ème année secondaire (Bac) Ahmed B. 1 0" [ref=e388] [cursor=pointer]:
                - /url: /ressources/e2e-approve-test-1781775861107-m5Ijs
                - generic [ref=e389]:
                  - generic [ref=e390]:
                    - generic [ref=e391]: 📖 Cours
                    - generic [ref=e392]: NaN-2023-2024
                  - heading "E2E Approve Test 1781775861107" [level=3] [ref=e393]
                  - paragraph [ref=e394]: Resource to test admin approval
                  - generic [ref=e395]:
                    - generic [ref=e396]:
                      - img [ref=e397]
                      - text: Mathématiques
                    - generic [ref=e400]:
                      - generic [ref=e401]: 🎒
                      - text: 4ème année secondaire (Bac)
                  - generic [ref=e402]:
                    - generic [ref=e403]:
                      - img [ref=e404]
                      - text: Ahmed B.
                    - generic [ref=e407]:
                      - generic [ref=e408]:
                        - img [ref=e409]
                        - text: "1"
                      - generic [ref=e412]:
                        - img [ref=e413]
                        - text: "0"
              - link "📖 Cours E2E Self-Approve Test 1781773664148 Mathématiques 🎒 4ème année secondaire (Bac) Ahmed B. 3 0" [ref=e416] [cursor=pointer]:
                - /url: /ressources/e2e-self-approve-test-1781773664148-FJ3Pd
                - generic [ref=e417]:
                  - generic [ref=e419]: 📖 Cours
                  - heading "E2E Self-Approve Test 1781773664148" [level=3] [ref=e420]
                  - generic [ref=e421]:
                    - generic [ref=e422]:
                      - img [ref=e423]
                      - text: Mathématiques
                    - generic [ref=e426]:
                      - generic [ref=e427]: 🎒
                      - text: 4ème année secondaire (Bac)
                  - generic [ref=e428]:
                    - generic [ref=e429]:
                      - img [ref=e430]
                      - text: Ahmed B.
                    - generic [ref=e433]:
                      - generic [ref=e434]:
                        - img [ref=e435]
                        - text: "3"
                      - generic [ref=e438]:
                        - img [ref=e439]
                        - text: "0"
              - link "📖 Cours NaN-2023-2024 E2E Approve Test 1781773660400 Resource to test admin approval Mathématiques 🎒 4ème année secondaire (Bac) Ahmed B. 1 0" [ref=e442] [cursor=pointer]:
                - /url: /ressources/e2e-approve-test-1781773660400-PGcft
                - generic [ref=e443]:
                  - generic [ref=e444]:
                    - generic [ref=e445]: 📖 Cours
                    - generic [ref=e446]: NaN-2023-2024
                  - heading "E2E Approve Test 1781773660400" [level=3] [ref=e447]
                  - paragraph [ref=e448]: Resource to test admin approval
                  - generic [ref=e449]:
                    - generic [ref=e450]:
                      - img [ref=e451]
                      - text: Mathématiques
                    - generic [ref=e454]:
                      - generic [ref=e455]: 🎒
                      - text: 4ème année secondaire (Bac)
                  - generic [ref=e456]:
                    - generic [ref=e457]:
                      - img [ref=e458]
                      - text: Ahmed B.
                    - generic [ref=e461]:
                      - generic [ref=e462]:
                        - img [ref=e463]
                        - text: "1"
                      - generic [ref=e466]:
                        - img [ref=e467]
                        - text: "0"
              - link "📖 Cours E2E Self-Approve Test 1781772033581 Mathématiques 🎒 4ème année secondaire (Bac) Ahmed B. 2 0" [ref=e470] [cursor=pointer]:
                - /url: /ressources/e2e-self-approve-test-1781772033581-JiJ6B
                - generic [ref=e471]:
                  - generic [ref=e473]: 📖 Cours
                  - heading "E2E Self-Approve Test 1781772033581" [level=3] [ref=e474]
                  - generic [ref=e475]:
                    - generic [ref=e476]:
                      - img [ref=e477]
                      - text: Mathématiques
                    - generic [ref=e480]:
                      - generic [ref=e481]: 🎒
                      - text: 4ème année secondaire (Bac)
                  - generic [ref=e482]:
                    - generic [ref=e483]:
                      - img [ref=e484]
                      - text: Ahmed B.
                    - generic [ref=e487]:
                      - generic [ref=e488]:
                        - img [ref=e489]
                        - text: "2"
                      - generic [ref=e492]:
                        - img [ref=e493]
                        - text: "0"
              - link "📖 Cours NaN-2023-2024 E2E Approve Test 1781772030107 Resource to test admin approval Mathématiques 🎒 4ème année secondaire (Bac) Ahmed B. 1 0" [ref=e496] [cursor=pointer]:
                - /url: /ressources/e2e-approve-test-1781772030107-2z81A
                - generic [ref=e497]:
                  - generic [ref=e498]:
                    - generic [ref=e499]: 📖 Cours
                    - generic [ref=e500]: NaN-2023-2024
                  - heading "E2E Approve Test 1781772030107" [level=3] [ref=e501]
                  - paragraph [ref=e502]: Resource to test admin approval
                  - generic [ref=e503]:
                    - generic [ref=e504]:
                      - img [ref=e505]
                      - text: Mathématiques
                    - generic [ref=e508]:
                      - generic [ref=e509]: 🎒
                      - text: 4ème année secondaire (Bac)
                  - generic [ref=e510]:
                    - generic [ref=e511]:
                      - img [ref=e512]
                      - text: Ahmed B.
                    - generic [ref=e515]:
                      - generic [ref=e516]:
                        - img [ref=e517]
                        - text: "1"
                      - generic [ref=e520]:
                        - img [ref=e521]
                        - text: "0"
              - link "📝 Devoir NaN-2024-2025 Devoir de Synthèse N°3 - Math DEVOIR SYNTHESE N3 - 9ème (2024-2025) Mathématiques 🎒 9ème année de base Ridha G. 33 0" [ref=e524] [cursor=pointer]:
                - /url: /ressources/devoir-de-synth-se-n-3-math-devoir-synthese-n3-9-me-2024-202-1mgR9
                - generic [ref=e525]:
                  - generic [ref=e526]:
                    - generic [ref=e527]: 📝 Devoir
                    - generic [ref=e528]: NaN-2024-2025
                  - heading "Devoir de Synthèse N°3 - Math DEVOIR SYNTHESE N3 - 9ème (2024-2025)" [level=3] [ref=e529]
                  - generic [ref=e530]:
                    - generic [ref=e531]:
                      - img [ref=e532]
                      - text: Mathématiques
                    - generic [ref=e535]:
                      - generic [ref=e536]: 🎒
                      - text: 9ème année de base
                  - generic [ref=e537]:
                    - generic [ref=e538]:
                      - img [ref=e539]
                      - text: Ridha G.
                    - generic [ref=e542]:
                      - generic [ref=e543]:
                        - img [ref=e544]
                        - text: "33"
                      - generic [ref=e547]:
                        - img [ref=e548]
                        - text: "0"
              - link "📝 Devoir NaN-2023-2024 Devoir de Synthèse N°3 - Math - 9ème (2023-2024) Mathématiques 🎒 9ème année de base Ridha G. 70 0" [ref=e551] [cursor=pointer]:
                - /url: /ressources/devoir-de-synth-se-n-3-math-9-me-2023-2024-gharbi-ridha-uya3O
                - generic [ref=e552]:
                  - generic [ref=e553]:
                    - generic [ref=e554]: 📝 Devoir
                    - generic [ref=e555]: NaN-2023-2024
                  - heading "Devoir de Synthèse N°3 - Math - 9ème (2023-2024)" [level=3] [ref=e556]
                  - generic [ref=e557]:
                    - generic [ref=e558]:
                      - img [ref=e559]
                      - text: Mathématiques
                    - generic [ref=e562]:
                      - generic [ref=e563]: 🎒
                      - text: 9ème année de base
                  - generic [ref=e564]:
                    - generic [ref=e565]:
                      - img [ref=e566]
                      - text: Ridha G.
                    - generic [ref=e569]:
                      - generic [ref=e570]:
                        - img [ref=e571]
                        - text: "70"
                      - generic [ref=e574]:
                        - img [ref=e575]
                        - text: "0"
            - generic [ref=e578]:
              - button [disabled] [ref=e579]:
                - img [ref=e580]
              - generic [ref=e582]: Page 1 / 12
              - button [ref=e583] [cursor=pointer]:
                - img [ref=e584]
    - contentinfo [ref=e586]:
      - generic [ref=e587]:
        - generic [ref=e588]:
          - generic [ref=e589]:
            - link "EduTunisie Plateforme pédagogique" [ref=e590] [cursor=pointer]:
              - /url: /
              - img [ref=e592]
              - generic [ref=e595]:
                - generic [ref=e596]: EduTunisie
                - generic [ref=e597]: Plateforme pédagogique
            - paragraph [ref=e598]: Conçu avec ❤️ en Tunisie 🇹🇳 pour les élèves tunisiens
            - generic [ref=e599]:
              - link [ref=e600] [cursor=pointer]:
                - /url: "#"
                - img [ref=e601]
              - link [ref=e603] [cursor=pointer]:
                - /url: "#"
                - img [ref=e604]
              - link [ref=e606] [cursor=pointer]:
                - /url: "#"
                - img [ref=e607]
              - link [ref=e610] [cursor=pointer]:
                - /url: "#"
                - img [ref=e611]
          - generic [ref=e614]:
            - heading "Navigation" [level=4] [ref=e615]
            - list [ref=e616]:
              - listitem [ref=e617]:
                - link "Accueil" [ref=e618] [cursor=pointer]:
                  - /url: /
              - listitem [ref=e619]:
                - link "Ressources" [ref=e620] [cursor=pointer]:
                  - /url: /ressources
              - listitem [ref=e621]:
                - link "Niveaux" [ref=e622] [cursor=pointer]:
                  - /url: /niveaux
              - listitem [ref=e623]:
                - link "Matières" [ref=e624] [cursor=pointer]:
                  - /url: /matieres
              - listitem [ref=e625]:
                - link "Professeurs" [ref=e626] [cursor=pointer]:
                  - /url: /professeurs
          - generic [ref=e627]:
            - heading "Ressources" [level=4] [ref=e628]
            - list [ref=e629]:
              - listitem [ref=e630]:
                - link "Type" [ref=e631] [cursor=pointer]:
                  - /url: /ressources?type=COURSE
              - listitem [ref=e632]:
                - link "Devoirs" [ref=e633] [cursor=pointer]:
                  - /url: /ressources?type=HOMEWORK
              - listitem [ref=e634]:
                - link "Sujets Bac" [ref=e635] [cursor=pointer]:
                  - /url: /ressources?type=BAC_SUBJECT
              - listitem [ref=e636]:
                - link "Corrigés" [ref=e637] [cursor=pointer]:
                  - /url: /ressources?type=CORRECTION
          - generic [ref=e638]:
            - heading "À propos" [level=4] [ref=e639]
            - list [ref=e640]:
              - listitem [ref=e641]:
                - link "CGU" [ref=e642] [cursor=pointer]:
                  - /url: /cgu
              - listitem [ref=e643]:
                - link "À propos" [ref=e644] [cursor=pointer]:
                  - /url: /a-propos
              - listitem [ref=e645]:
                - link "Contact" [ref=e646] [cursor=pointer]:
                  - /url: /contact
        - generic [ref=e647]:
          - paragraph [ref=e648]: © 2026 EduTunisie. Tous droits réservés.
          - paragraph [ref=e649]: Conçu avec ❤️ en Tunisie 🇹🇳 pour les élèves tunisiens
  - alert [ref=e650]
```

# Test source

```ts
  162 | 
  163 |   // ==========================================================================
  164 |   // 9. SEARCH BAR (in-page)
  165 |   // ==========================================================================
  166 |   test('9. In-page search bar submits to /recherche?q=', async ({ page }) => {
  167 |     const searchInput = page.locator('input[placeholder*="Rechercher" i]').last();
  168 | 
  169 |     await searchInput.fill('math');
  170 |     // Submit by pressing Enter on the input
  171 |     await searchInput.press('Enter');
  172 |     await page.waitForURL(/q=math/, { timeout: 5000 });
  173 | 
  174 |     expect(page.url()).toContain('q=math');
  175 |     await expect(page.locator('h1')).toContainText('math');
  176 |   });
  177 | 
  178 |   test('10. Search bar shows suggestions dropdown', async ({ page }) => {
  179 |     const searchInput = page.locator('input[placeholder*="Rechercher" i]').last();
  180 | 
  181 |     await searchInput.click();
  182 |     await searchInput.fill('math');
  183 |     await page.waitForTimeout(800);
  184 | 
  185 |     // Dropdown should appear - search for any visible dropdown in main content
  186 |     const dropdowns = page.locator('div[class*="z-50"]');
  187 |     const count = await dropdowns.count();
  188 |     expect(count).toBeGreaterThan(0);
  189 |   });
  190 | 
  191 |   // ==========================================================================
  192 |   // 11. PAGINATION
  193 |   // ==========================================================================
  194 |   test('11. Pagination works (next/prev)', async ({ page }) => {
  195 |     // Go to page 2 directly
  196 |     await page.goto(`${BASE_URL}/recherche?page=2`);
  197 |     await page.waitForLoadState('networkidle');
  198 | 
  199 |     const pageIndicator = page.locator('text=/Page 2 \\//');
  200 |     if (await pageIndicator.count() > 0) {
  201 |       await expect(pageIndicator).toBeVisible();
  202 | 
  203 |       // Click previous
  204 |       const prevBtn = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).first();
  205 |       await prevBtn.click();
  206 |       await page.waitForTimeout(500);
  207 |       expect(page.url()).toContain('page=1');
  208 |     }
  209 |   });
  210 | 
  211 |   // ==========================================================================
  212 |   // 12. RESULT CARD LINK
  213 |   // ==========================================================================
  214 |   test('12. Result card link navigates to resource page', async ({ page }) => {
  215 |     // Click first result card
  216 |     const firstCard = page.locator('a[href*="/ressources/"]').first();
  217 |     await firstCard.click();
  218 |     await page.waitForLoadState('networkidle');
  219 | 
  220 |     expect(page.url()).toMatch(/\/ressources\//);
  221 |   });
  222 | 
  223 |   // ==========================================================================
  224 |   // 13. HIDE-ON-SCROLL BEHAVIOR
  225 |   // ==========================================================================
  226 |   test('13. Search bar hides on scroll down', async ({ page }) => {
  227 |     // Find the search bar wrapper
  228 |     const searchWrapper = page.locator('[class*="sticky"][class*="top-20"]').first();
  229 | 
  230 |     // Initially visible
  231 |     await expect(searchWrapper).toBeVisible();
  232 | 
  233 |     // Scroll down
  234 |     await page.evaluate(() => window.scrollBy(0, 300));
  235 |     await page.waitForTimeout(500);
  236 | 
  237 |     // Should have translate-y-full class (hidden)
  238 |     const className = await searchWrapper.getAttribute('class');
  239 |     expect(className).toContain('translate-y-full');
  240 | 
  241 |     // Scroll up
  242 |     await page.evaluate(() => window.scrollBy(0, -200));
  243 |     await page.waitForTimeout(500);
  244 | 
  245 |     // Should be visible again
  246 |     const newClass = await searchWrapper.getAttribute('class');
  247 |     expect(newClass).toContain('translate-y-0');
  248 |   });
  249 | 
  250 |   // ==========================================================================
  251 |   // 14. EMPTY STATE
  252 |   // ==========================================================================
  253 |   test('14. Empty state shows when no results', async ({ page }) => {
  254 |     await page.goto(`${BASE_URL}/recherche?q=zzzzzzzznonexistent12345`);
  255 |     await page.waitForLoadState('networkidle');
  256 |     await page.waitForTimeout(1000);
  257 | 
  258 |     // Either no-results message or zero count
  259 |     const noResults = page.locator('text=Aucun résultat');
  260 |     const count = page.locator('text=/0\\s+ressources/');
  261 |     const hasEmpty = (await noResults.count() > 0) || (await count.count() > 0);
> 262 |     expect(hasEmpty).toBeTruthy();
      |                      ^ Error: expect(received).toBeTruthy()
  263 |   });
  264 | 
  265 |   // ==========================================================================
  266 |   // 15. LOADING STATE
  267 |   // ==========================================================================
  268 |   test('15. Refresh on filter change shows loading state', async ({ page }) => {
  269 |     // Apply a filter that requires refetch
  270 |     const typeFilter = page.locator('button:has-text("Devoir")').first();
  271 |     await typeFilter.click();
  272 | 
  273 |     // Should eventually settle
  274 |     await page.waitForTimeout(1500);
  275 |     await expect(page.locator('h1')).toBeVisible();
  276 |   });
  277 | 
  278 |   // ==========================================================================
  279 |   // 16. NO JAVASCRIPT ERRORS
  280 |   // ==========================================================================
  281 |   test('16. No console errors on page load', async ({ page }) => {
  282 |     const errors: string[] = [];
  283 |     page.on('console', msg => {
  284 |       if (msg.type() === 'error') errors.push(msg.text());
  285 |     });
  286 |     page.on('pageerror', err => errors.push(err.message));
  287 | 
  288 |     await page.goto(`${BASE_URL}/recherche`);
  289 |     await page.waitForLoadState('networkidle');
  290 | 
  291 |     // Filter out known harmless errors
  292 |     const real = errors.filter(e =>
  293 |       !e.includes('favicon') &&
  294 |       !e.includes('Failed to load resource') // network glitches
  295 |     );
  296 | 
  297 |     expect(real).toEqual([]);
  298 |   });
  299 | 
  300 |   // ==========================================================================
  301 |   // 17. RESPONSIVE - MOBILE FILTER TOGGLE
  302 |   // ==========================================================================
  303 |   test('17. Mobile: filter toggle button works', async ({ page }) => {
  304 |     await page.setViewportSize({ width: 375, height: 667 });
  305 |     await page.goto(`${BASE_URL}/recherche`);
  306 |     await page.waitForLoadState('networkidle');
  307 | 
  308 |     // Filter button should be visible on mobile
  309 |     const filterToggle = page.locator('button:has-text("Filtres")').first();
  310 |     if (await filterToggle.isVisible()) {
  311 |       await filterToggle.click();
  312 |       await page.waitForTimeout(300);
  313 |       // Sidebar should now be visible
  314 |     }
  315 |   });
  316 | 
  317 |   // ==========================================================================
  318 |   // 18. YEAR FILTER
  319 |   // ==========================================================================
  320 |   test('18. Year filter works', async ({ page }) => {
  321 |     // Find a year filter
  322 |     const yearFilter = page.locator('aside button').filter({ hasText: /^\d{4}-\d{4}$/ }).first();
  323 | 
  324 |     if (await yearFilter.count() > 0) {
  325 |       await yearFilter.click();
  326 |       await page.waitForTimeout(500);
  327 |       expect(page.url()).toContain('year=');
  328 |     }
  329 |   });
  330 | 
  331 |   // ==========================================================================
  332 |   // 19. TEACHER FILTER
  333 |   // ==========================================================================
  334 |   test('19. Teacher filter works', async ({ page }) => {
  335 |     // Find a teacher in the Enseignant section
  336 |     const teacherFilter = page.locator('aside button:has-text("Ahmed")').first();
  337 | 
  338 |     if (await teacherFilter.count() > 0) {
  339 |       await teacherFilter.click();
  340 |       await page.waitForTimeout(500);
  341 |       expect(page.url()).toContain('teacher=');
  342 |     }
  343 |   });
  344 | 
  345 |   // ==========================================================================
  346 |   // 20. COMBINED FILTERS
  347 |   // ==========================================================================
  348 |   test('20. Multiple filters combine correctly', async ({ page }) => {
  349 |     // Apply type + subject
  350 |     await page.locator('button:has-text("Devoir")').first().click();
  351 |     await page.waitForTimeout(300);
  352 | 
  353 |     const math = page.locator('aside button:has-text("Mathématiques")').first();
  354 |     if (await math.count() > 0) {
  355 |       await math.click();
  356 |       await page.waitForTimeout(500);
  357 | 
  358 |       // URL should have both
  359 |       expect(page.url()).toContain('type=HOMEWORK');
  360 |       expect(page.url()).toContain('subject=');
  361 |     }
  362 |   });
```