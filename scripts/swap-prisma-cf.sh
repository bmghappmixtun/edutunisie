#!/bin/bash
# Swap prisma.ts with prisma.cf.ts for Cloudflare builds
# 
# Why: Prisma's native binary engine doesn't work in Cloudflare Workers
# (uses fs.readdir which Workers don't support). The CF version uses
# @prisma/adapter-pg + Hyperdrive instead.
# 
# Usage:
#   ./scripts/swap-prisma-cf.sh    # swap to CF version
#   ./scripts/swap-prisma-cf.sh restore  # restore Vercel version

set -e

PRISMA_FILE="src/lib/prisma.ts"
CF_FILE="src/lib/prisma.cf.ts"
BACKUP_FILE="src/lib/prisma.ts.vercel.bak"

if [ "$1" = "restore" ]; then
  if [ -f "$BACKUP_FILE" ]; then
    mv "$BACKUP_FILE" "$PRISMA_FILE"
    echo "✓ Restored Vercel version of prisma.ts"
  else
    echo "❌ No backup found, nothing to restore"
    exit 1
  fi
elif [ "$1" = "status" ]; then
  if [ -f "$BACKUP_FILE" ]; then
    echo "Currently swapped to CF version (backup exists)"
  else
    echo "Currently using Vercel version (no backup)"
  fi
else
  if [ -f "$BACKUP_FILE" ]; then
    echo "Already swapped (backup exists), nothing to do"
    exit 0
  fi
  if [ ! -f "$CF_FILE" ]; then
    echo "❌ $CF_FILE not found"
    exit 1
  fi
  cp "$PRISMA_FILE" "$BACKUP_FILE"
  cp "$CF_FILE" "$PRISMA_FILE"
  echo "✓ Swapped to CF version (backup at $BACKUP_FILE)"
  echo "  Run '$0 restore' after CF build to restore Vercel version"
fi
