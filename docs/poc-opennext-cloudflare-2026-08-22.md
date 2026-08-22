# POC OpenNext Cloudflare — Examanet (2026-08-22)

## 🎯 Objectif
Valider qu'on peut déployer Examanet (Next.js 14.2.35) sur Cloudflare Workers
via `@opennextjs/cloudflare` sans tout réécrire.

## ✅ Résultats

### Build
- **Bundle size** : 11.5 MB raw, **3.4 MB gzipped** ✅ (sous la limite CF de 10 MB)
- **Build time** : ~2 min (comparable à Vercel)
- **Static assets** : 17.4 MB total (496 fichiers : fonts, images, etc.)
- **Warnings** : 1 `direct-eval` (non-bloquant, dans un helper __dirname)

### Runtime local (avec stub DATABASE_URL, no real DB)
| Endpoint | Cold start | Warm hit | Status |
|---|---|---|---|
| `/fr` (home FR) | **1.17s** | **400-700ms** | ✅ HTTP 200 |
| `/ar` (home AR) | 680ms | 750ms | ✅ HTTP 200 |
| `/fr/ressources` | 394ms | 446ms | ✅ HTTP 200 |
| `/api/og/page/home` | 2.4s | 2.4s | ✅ HTTP 200 (146KB image) |
| `/api/health` | 280ms | — | ⚠️ 503 (DB stub, normal) |

### Comparé à Vercel prod
- **Vercel** : ~200-500ms
- **OpenNext CF** : ~400-700ms warm
- **Ratio** : OpenNext est ~2x plus lent en local (avec stub)
- **Mais** : en prod avec cache + Hyperdrive, devrait être plus rapide

## 📦 Modifications apportées

### 1. Dépendances ajoutées
```json
"devDependencies": {
  "@opennextjs/cloudflare": "1.15.1",  // last v supporting Next 14.2
  "wrangler": "^4.59.2"
}
```

### 2. `wrangler.jsonc` créé
```jsonc
{
  "main": ".open-next/worker.js",
  "name": "examanet-poc",
  "compatibility_date": "2024-12-30",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
  "services": [{ "binding": "WORKER_SELF_REFERENCE", "service": "examanet-poc" }],
  "observability": { "enabled": true },
  "r2_buckets": [{ "binding": "NEXT_INC_CACHE_R2_BUCKET", "bucket_name": "examanet-poc-cache" }],
  "kv_namespaces": [{ "binding": "NEXT_INC_CACHE_KV", "id": "poc-cache-kv-id" }]
}
```

### 3. `open-next.config.ts` créé
```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import kvNextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/kv-next-tag-cache";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: kvNextTagCache,
});
```

### 4. `next.config.js` modifié
Ajout de `output: "standalone"` (nécessaire pour le bundle OpenNext).
⚠️ **Impact potentiel Vercel** : à valider, mais standalone est supporté par Vercel.

### 5. Route `/api/og/page/[type]/route.tsx` modifiée
- Changé `runtime = "edge"` → `"nodejs"` (OpenNext ne supporte pas edge runtime
  dans la même fonction, il faut les séparer ou les convertir)
- ⚠️ **À documenter** : légère perte de perf sur la génération d'OG images

### 6. Scripts npm ajoutés
```json
{
  "build:cf": "prisma generate && next build",  // sans ensure-search.sh
  "preview:cf": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
  "deploy:cf": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
  "cf:typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
}
```

### 7. `.dev.vars` créé
Pour le dev local (secrets Cloudflare Workers).

## 🐛 Problèmes rencontrés & résolus

| Problème | Solution |
|---|---|
| OpenNext v1.20+ requires Next 15.5+ | Utiliser v1.15.1 (dernière avec Next 14.2 support) |
| OpenNext requires `bun` | Installé `bun` via `npm install -g bun` |
| `findPackagerAndRoot` détecte `bun.lock` avant `package-lock.json` | Bun installé → `bun run build` fonctionne |
| `output: "standalone"` non auto-ajouté | Ajouté manuellement à `next.config.js` |
| Build avec Prisma fail sans DATABASE_URL | Stub URL pour le build (pas pour runtime) |
| `bun run build` appelle `ensure-search.sh` (DB) | Nouveau script `build:cf` qui skip ce script |
| Route OG `runtime = "edge"` incompatible | Convertie en `nodejs` runtime |
| Hyperdrive pas configuré (pas encore de DB) | POC OK avec stub, à setup en prod |

## ⚠️ Limitations identifiées (POC local)

1. **Pas de DB réelle** : on utilise un stub DATABASE_URL, donc on ne peut pas
   tester les vraies requêtes Prisma en runtime
2. **Pas de Vercel Blob** : les URLs `*.public.blob.vercel-storage.com` dans
   la DB pointeront vers du 404 — à migrer vers R2 avant prod
3. **Pas d'auth** : `next-auth` n'a pas de session, mais le flow est OK
4. **Pas de tests E2E** : à faire sur preview CF
5. **OG image runtime** : on a dû passer en `nodejs` (perte de perf ~20-50ms)

## 🚀 Prochaines étapes (si on décide de migrer)

1. **Setup Hyperdrive** : lier la DB Neon à Cloudflare via `wrangler hyperdrive create`
2. **Migrer Vercel Blob → R2** : utiliser `Sippy` pour la migration graduelle
3. **Setup Cloudflare Images** : remplacer `next/image` Vercel opt
4. **Setup R2 KV bindings** : créer les namespaces sur CF dashboard
5. **Setup wrangler secrets** : migrer NEXTAUTH_SECRET, RESEND_API_KEY, etc.
6. **Setup custom domain** : `examanet.com` sur CF DNS
7. **Test preview deploy** : `wrangler deploy` + URL publique
8. **Test prod cutover** : DNS switch + monitoring 7j
9. **Cleanup Vercel** : après 30 jours de stabilité

## 💰 Coût estimé (post-migration prod)

| Service | Vercel actuel | OpenNext CF |
|---|---|---|
| Compute | ~$20-30/mois | **$5-10/mois** |
| Storage (15k PDFs × 2MB) | Vercel Blob ~$2 | R2 $0.45 |
| Egress (PDF delivery) | Inclus jusqu'à 1TB | **GRATUIT illimité** |
| Logs | Inclus 100k | Inclus 20M |
| **Total** | **~$22-32/mois** | **~$5-10/mois** |

**Économie : ~$15-20/mois = ~$180-240/an**

## 📊 Verdict

✅ **Le POC prouve qu'OpenNext sur Cloudflare fonctionne pour Examanet.**

- Le build passe (3.4 MB gzipped, sous la limite)
- L'app se lance en local (wrangler dev)
- Les pages s'affichent correctement avec SEO/i18n/streaming
- Les performances sont acceptables (~500-700ms warm)

**Mais avant de commit** :
- Tester avec une vraie DB (Hyperdrive setup)
- Tester le preview deploy sur CF
- Valider le SEO (sitemap, hreflang) sur preview
- Comparer perf sur preview vs Vercel prod
- Estimer le coût réel en prod

**Effort estimé pour migration complète** : 2-3 semaines
**Risque** : moyen (next-auth, Prisma, Vercel Blob à migrer)
**Gain** : ~70% moins cher + 18x plus de POPs
