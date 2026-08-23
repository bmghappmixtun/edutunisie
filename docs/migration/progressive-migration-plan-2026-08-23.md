# Migration progressive Examanet : Vercel → Cloudflare (2026-08-23)

## 🎯 Objectif

Migrer progressivement Examanet de Vercel vers Cloudflare Workers
tout en gardant **Vercel live jusqu'à cutover final validé**.

## 🛡️ Principes

1. **Zéro downtime** : Vercel reste la prod jusqu'au cutover
2. **Réversible** : chaque étape peut être annulée
3. **Testé étape par étape** : on ne passe à la suivante que si la précédente est OK
4. **Observabilité** : on monitore en permanence
5. **Vercel en standby 30j** après cutover, puis cleanup

## 📅 Timeline

| Étape | Description | Durée | Risque |
|---|---|---|---|
| 0 | Cleanup POC + docs | 30 min | 🟢 Aucun (POC) |
| 1 | Décision Paid plan ($5/mo) vs surgery | 5 min | 🟢 Aucun |
| 2 | Setup R2 prod bucket | 1h | 🟢 Aucun |
| 3 | Setup Hyperdrive (Neon → CF) | 1h | 🟢 Aucun |
| 4 | Migrate Vercel Blob → R2 (Sippy) | 24-48h progressif | 🟡 Faible |
| 5 | Setup Cloudflare Images | 2h | 🟢 Aucun |
| 6 | Setup CF secrets | 30 min | 🟢 Aucun |
| 7 | Build prod worker + deploy staging | 4h | 🟡 Faible |
| 8 | **Split traffic** : Vercel 90% / CF 10% | 1-2 semaines | 🟡 Moyen |
| 9 | Monitor + ajuste | continu | 🟢 Aucun |
| 10 | **Cutover** : Vercel 0% / CF 100% | 30 min | 🔴 Élevé |
| 11 | Cleanup Vercel après 30j | 1h | 🟢 Aucun |

**Durée totale estimée** : 4-6 semaines

## 🏗️ Architecture cible

```
┌─────────────────────────────────────────────────────────┐
│                    examanet.com (DNS)                   │
│                    (Vercel = primary)                   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ 90% traffic
                      ▼
┌─────────────────────────────────────────────────────────┐
│            Vercel (FRA1) - LIVE                         │
│  - Next.js 14.2.35 + ISR                                │
│  - Vercel Blob (PDFs)                                   │
│  - Neon DB (direct)                                     │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ 10% traffic (gradual)
                      ▼
┌─────────────────────────────────────────────────────────┐
│      Cloudflare Workers (examanet-poc)                  │
│  - Next.js via @opennextjs/cloudflare                   │
│  - R2 bucket (PDFs, après migration)                    │
│  - Hyperdrive → Neon DB                                 │
│  - KV (ISR cache)                                       │
│  - Cloudflare Images (replaces next/image)              │
└─────────────────────────────────────────────────────────┘
```

## 📋 Étapes détaillées

### Step 0 : Cleanup POC + docs

**Goal** : nettoyer le POC sans casser la prod

- ✅ Supprimer le worker POC `examanet-poc` (on en recrée un propre pour prod)
- ✅ Renommer le worktree POC en `cf-staging`
- ✅ Garder le rapport POC comme référence
- ✅ Setup nouvelle branche `feature/cf-migration-step-N` pour chaque step

**Validation** : Vercel toujours 200, pas de changement

---

### Step 1 : Décision Paid plan vs surgery

**Question** : upgrade à Workers Paid ($5/mois) ou garder la surgery ?

| Option | Pour | Contre |
|---|---|---|
| **Paid ($5/mois)** | Pas de surgery, build clean, plus de features (cron, logpush, etc.) | Coût récurrent |
| **Surgery (gratuit)** | Pas de coût | Bundle hacks, OG disabled, plus fragile |

**Recommandation** : **Paid** pour la prod. La surgery c'était pour le POC, pas pour 159 pages + 128 API routes en prod.

**Action** : upgrade account via https://dash.cloudflare.com/.../workers/plans

**Coût additionnel** : $5/mois (~60€/an)

---

### Step 2 : Setup R2 production bucket

**Goal** : créer le bucket prod pour les PDFs

```bash
# Worker prod (séparé du POC)
npx wrangler r2 bucket create examanet-pdf-prod

# Vérifier
npx wrangler r2 bucket list
```

**Status** : ⏳ À faire

**Validation** : bucket visible sur dashboard CF

---

### Step 3 : Setup Hyperdrive (Neon → Cloudflare)

**Goal** : permettre au worker CF de se connecter à Neon

```bash
# Récupérer la connection string Neon (unpooled, pgbouncer=false)
# URL type: postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require

# Créer le binding Hyperdrive
npx wrangler hyperdrive create examanet-neon \
  --connection-string="<NEON_URL>"
```

**Status** : ⏳ À faire

**Note importante** : Hyperdrive veut la connection **directe** (pas via pooler Neon)

**Validation** : connection test depuis le worker

---

### Step 4 : Migrate Vercel Blob → R2 (Sippy)

**Goal** : déplacer les 15k PDFs (30 GB) de Vercel Blob vers R2

**Sippy** = lazy migration : R2 copie depuis Vercel Blob au premier read

```bash
# Setup Sippy
# Dashboard Cloudflare → R2 → examanet-pdf-prod → Settings → Sippy
# Source bucket: Vercel Blob URL
# Destination: examanet-pdf-prod
```

**Status** : ⏳ À faire (24-48h pour migration complète)

**Pendant la migration** :
- Les URLs `*.public.blob.vercel-storage.com` continuent de marcher
- R2 prend le relais automatiquement au premier read
- Zéro downtime

**Après la migration** :
- Update la DB : `pdfUrl` pointe vers R2
- Les Workers lisent depuis R2
- Vercel Blob peut être supprimé

---

### Step 5 : Setup Cloudflare Images

**Goal** : remplacer `next/image` Vercel opt par Cloudflare Images

**Option A** : `next.config.js` → `images.loader: "custom"` + loader custom
**Option B** : `images.unoptimized: true` (comme le POC) + CDN direct
**Option C** : remplacer `<Image>` par `<img>` (simple mais perd les optims)

**Recommandation** : **Option A** (loader custom)

**Status** : ⏳ À faire

---

### Step 6 : Setup CF secrets

**Goal** : migrer les env vars de Vercel vers CF Worker secrets

```bash
npx wrangler secret put DATABASE_URL          # URL Neon unpooled
npx wrangler secret put NEXTAUTH_SECRET       # random 32 chars
npx wrangler secret put NEXTAUTH_URL          # https://cf.examanet.com
npx wrangler secret put RESEND_API_KEY        # depuis Vercel
npx wrangler secret put BLOB_READ_WRITE_TOKEN # devient R2 token
```

**Status** : ⏳ À faire

---

### Step 7 : Build prod worker + deploy staging

**Goal** : un worker prod clean, sans les hacks du POC

**Actions** :
1. Nouvelle branche `feature/cf-migration-prod`
2. Build clean (pas de sharp stub, pas de WASM deleted)
3. Si Paid plan actif : bundle 2.4 MB → OK
4. Si free plan : appliquer la surgery + taille OK
5. Deploy sur `examanet-staging.workers.dev` (subdomain séparé)

**Status** : ⏳ À faire

**Tests** :
- ✅ Pages statiques : /fr, /ar, /fr/ressources
- ✅ Pages dynamiques : /fr/ressources/[id]/[slug]
- ✅ API routes : /api/health, /api/search
- ✅ Auth flow : login, register
- ✅ Upload PDF : /api/upload
- ✅ Sitemap : /sitemap.xml (15k URLs)
- ✅ SEO : hreflang, canonical, og:locale

---

### Step 8 : Split traffic (Vercel 90% / CF 10%)

**Goal** : envoyer 10% du trafic prod vers CF, sans impacter les users

**Option A** : Cloudflare Load Balancer
```yaml
# Cloudflare Load Balancer setup
# Origin pool 1: Vercel (90%)
# Origin pool 2: CF Worker (10%)
# Weighted random: 90/10
```

**Option B** : DNS round-robin (plus simple)
- Pas vraiment supporté pour du weighted routing
- Skip cette option

**Option C** : Subdomain dédié
- `cf.examanet.com` → CF Worker
- `examanet.com` → Vercel
- Communication entre les deux via cookies ou feature flag
- Plus complexe

**Recommandation** : **Option A** (Cloudflare Load Balancer)

**Mais** : Load Balancer coûte $5/mois en plus. Si on est en free plan, on peut tester avec subdomain.

**Status** : ⏳ À faire

---

### Step 9 : Monitor + ajuste (1-2 semaines)

**KPIs à surveiller** :
- TTFB p50/p95/p99 (Vercel vs CF)
- Erreurs 5xx (CF doit être < 0.1%)
- Cold start time
- Memory usage
- CPU time
- Bandwidth (egress)
- Coût quotidien

**Outils** :
- Cloudflare Analytics (built-in, gratuit)
- Sentry / Logflare pour les erreurs
- Vercel Analytics (pour comparer)

**Status** : ⏳ À faire

---

### Step 10 : Cutover final (Vercel 0% / CF 100%)

**Goal** : tout le trafic sur Cloudflare

**Actions** :
1. **Backup final** : `pg_dump` Neon + snapshot R2
2. **Switch Load Balancer** : 100% CF
3. **Monitor 24h** : vérifier que tout marche
4. **Communication** : noter sur Slack/email
5. **Vercel en standby** : downgrade à plan Free, garder 30j

**Rollback plan** :
- Si erreur 5xx > 1% : repasser à 50/50 ou 100% Vercel
- Load Balancer permet de switcher en < 30s

**Status** : ⏳ À faire

---

### Step 11 : Cleanup Vercel (après 30j)

**Actions** :
1. **Vérifier** que toutes les métriques sont stables
2. **Export** les logs Vercel (30 derniers jours)
3. **Downgrade** Vercel en plan Free
4. **Supprimer** le projet Vercel
5. **Update** docs (architecture.html)
6. **Commit** final sur main

**Status** : ⏳ À faire

---

## 🚨 Rollback strategy

À chaque étape, on peut rollback :

| Étape | Rollback |
|---|---|
| Step 0 | Rien à rollback |
| Step 1 | Downgrade CF |
| Step 2-3 | Supprimer R2 / Hyperdrive |
| Step 4 | Réécrire les URLs en DB (point vers Vercel Blob) |
| Step 5 | Revert next.config.js |
| Step 6 | Supprimer secrets CF |
| Step 7 | Delete worker staging |
| Step 8 | Switch LB 100% Vercel |
| Step 9 | Analyse et fix |
| Step 10 | Switch LB 100% Vercel (< 30s) |
| Step 11 | Restore Vercel (impossible après 30j) |

## 💰 Coût de la migration

| Item | Coût |
|---|---|
| Workers Paid plan | $5/mois |
| R2 storage (30 GB) | $0.45/mois |
| R2 Class A (writes profs) | ~$0.05/mois |
| R2 Class B (reads élèves) | **GRATUIT** (< 10M) |
| Hyperdrive | Inclus dans Paid |
| Load Balancer (optionnel) | $5/mois |
| **TOTAL migration** | **~$10-15/mois** |
| **vs Vercel actuel** | **$22-32/mois** |
| **Économie** | **$10-20/mois = $120-240/an** |

## ✅ Critères de succès

La migration est considérée réussie quand :

- [ ] 0% de downtime pendant toute la migration
- [ ] TTFB CF ≤ 1.5x Vercel sur toutes les pages
- [ ] Erreurs 5xx CF ≤ 0.1%
- [ ] SEO non-régressé (Google Search Console stable)
- [ ] Sitemap toujours 100% crawlable
- [ ] Bundle < 5 MB (idéalement < 3 MB)
- [ ] Coût total < Vercel actuel
- [ ] Vercel backup vérifié et fonctionnel

## 📅 Schedule cible

| Date | Étape |
|---|---|
| 2026-08-23 | Steps 0-3 (aujourd'hui) |
| 2026-08-24 | Step 4 démarre (Sippy) |
| 2026-08-26 | Step 4 fini + Step 5-7 |
| 2026-08-30 | Step 8 (split traffic 10%) |
| 2026-09-15 | Step 10 (cutover) si tout va bien |
| 2026-10-15 | Step 11 (cleanup Vercel) |

**Total** : ~7 semaines de migration progressive
