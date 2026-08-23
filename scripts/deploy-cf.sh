#!/bin/bash
# Cloudflare-specific deploy script
# 
# Applies the CF-specific config changes (output: standalone, unoptimized images)
# only when building for Cloudflare. The main next.config.js stays clean
# for Vercel compatibility.
#
# Usage:
#   ./scripts/deploy-cf.sh build    # Apply CF config + build OpenNext bundle
#   ./scripts/deploy-cf.sh deploy   # build + deploy to CF
#   ./scripts/deploy-cf.sh revert   # Restore main next.config.js

set -e

ACTION="${1:-build}"

# Ensure bun is in PATH
export PATH="/usr/local/bin:$PATH"

if [ "$ACTION" = "revert" ]; then
  echo "→ Reverting CF-specific next.config.js changes"
  git checkout main -- next.config.js 2>/dev/null || git checkout HEAD -- next.config.js
  exit 0
fi

if [ "$ACTION" = "build" ] || [ "$ACTION" = "deploy" ]; then
  echo "→ Applying CF-specific next.config.js changes"
  
  # Backup original
  cp next.config.js next.config.js.original 2>/dev/null || true
  
  # Add output: standalone and unoptimized via node
  node -e "
  const fs = require('fs');
  let c = fs.readFileSync('next.config.js', 'utf8');
  
  // Add output: standalone if not present
  if (!c.includes('output: \"standalone\"')) {
    c = c.replace(
      'const nextConfig = {',
      'const nextConfig = {\n  output: \"standalone\",'
    );
  }
  
  // Add unoptimized: true if not present
  if (!c.includes('unoptimized: true')) {
    c = c.replace(
      'images: {',
      'images: {\n    // CLOUDFLARE POC: disable image optimization\n    unoptimized: true,'
    );
  }
  
  fs.writeFileSync('next.config.js', c);
  console.log('CF-specific next.config.js applied');
  "
  
  # Apply surgery (stub sharp, stub next/og, delete WASM)
  if [ -f "scripts/surgery-cf.sh" ]; then
    ./scripts/surgery-cf.sh
  fi

  # Swap prisma.ts with prisma.cf.ts (PrismaPg + Hyperdrive for Workers)
  if [ -f "scripts/swap-prisma-cf.sh" ]; then
    ./scripts/swap-prisma-cf.sh
  fi

  # Build with skipNextBuild (we run npx next build separately to avoid ensure-search.sh issues)
  echo "→ Running npx next build"
  rm -rf .next .open-next
  DATABASE_URL="${DATABASE_URL:-postgresql://stub:stub@localhost:5432/stub}" npx next build 2>&1 | tail -5

  echo "→ Running opennextjs-cloudflare build"
  DATABASE_URL="${DATABASE_URL:-postgresql://stub:stub@localhost:5432/stub}" npx opennextjs-cloudflare build --skipNextBuild 2>&1 | tail -10

  # Restore prisma.ts to Vercel version (so subsequent Vercel deploys work)
  if [ -f "scripts/swap-prisma-cf.sh" ]; then
    ./scripts/swap-prisma-cf.sh restore
  fi

  # Stub the Prisma native binary to reduce bundle size
  # The binary can't be loaded on Workers anyway, so we replace it with empty file
  if [ -f "scripts/stub-prisma-binary.sh" ]; then
    ./scripts/stub-prisma-binary.sh
  fi

  if [ "$ACTION" = "deploy" ]; then
    echo "→ Deploying to Cloudflare"
    CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="postgresql://stub:stub@localhost:5432/stub" \
      npx wrangler deploy 2>&1 | tail -10
  fi
fi
