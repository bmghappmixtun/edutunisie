# Cloudflare Migration — Status 2026-08-23

## ✅ Completed
- Step 0: Cleanup POC + docs
- Step 1: Decision — Free plan (3 MB) with bundle surgery
- Step 2: R2 prod bucket `examanet-pdf-prod` created
- Step 3: Hyperdrive `examanet-neon` → unpooled Neon endpoint

## ⏳ In Progress
- **Step 4 (Blob backup)**: Full backup to R2 (~12.6 GB total, ~5.5 GB done, 44% complete)
  - 30,108 files from Vercel Blob
  - 625 errors (orphaned DB refs to deleted Vercel Blob files)
  - Speed: 44 files/sec, ETA ~7 min

## ❌ Not Possible
- **Sippy** (incremental migration) — Vercel Blob is NOT S3-compatible.
  Sippy only supports AWS S3 and Google Cloud Storage.
  Vercel uses custom storage with a CDN URL but no public S3 endpoint.

## 📋 Next Steps (after backup completes)
- **Step 4b (Verify backup)**: Run R2 inventory, compare to DB count
- **Step 5 (CF Images)**: Configure `next.config.js` to use custom loader
  for CF Images (replaces `next/image`).
- **Step 6 (CF Secrets)**: Run `scripts/setup-cf-secrets.sh` after
  `wrangler login --device`.
- **Step 7 (Prod worker)**: Build clean prod worker on `examanet-prod`.
- **Step 8 (Split traffic)**: Cloudflare Load Balancer or DNS-level
  traffic split (Vercel 90% / CF 10%).

## ⚠️ Decisions Needed
- **Backup strategy after full backup**:
  - Use R2 as primary for new uploads (write to R2 instead of Vercel Blob)
  - OR keep Vercel Blob as primary (read-through to R2 fallback)
- **When to cutover**: Q1 2027 (per migration plan)
- **next-auth vs better-auth**: Keep next-auth (user decision 2026-08-23)

## 🔐 Security
- NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET are
  in Vercel dashboard, not in .env.local. Need to be added to
  .env.local or passed via env to setup-cf-secrets.sh.

## 💰 Cost Projection
- Vercel: $22-32/mo
- Cloudflare (post-migration): $5-7/mo (75% cheaper, 100% on egress)
- R2 storage: 12.6 GB × $0.015/GB = $0.19/mo
- R2 egress: $0 (free)

## 📁 Files Created Today
- `scripts/deploy-cf.sh` — applies CF-specific next.config.js changes
- `scripts/setup-cf-secrets.sh` — pushes 16 secrets to a target worker
- `scripts/setup-cf-secrets-poc.sh` — pushes 7 essential secrets to POC
- `docs/migration/cf-step-status-2026-08-23.md` — this doc
