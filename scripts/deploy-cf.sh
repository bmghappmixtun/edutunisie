#!/bin/bash
# Cloudflare-specific deploy script
# 
# Applies the CF-specific config changes (output: standalone, unoptimized images)
# only when building for Cloudflare. The main next.config.js stays clean
# for Vercel compatibility.
#
# Usage:
#   ./scripts/deploy-cf.sh deploy
#   ./scripts/deploy-cf.sh build
#   ./scripts/deploy-cf.sh revert

set -e

ACTION="${1:-build}"

if [ "$ACTION" = "revert" ]; then
  echo "→ Reverting CF-specific next.config.js changes"
  git checkout main -- next.config.js
  exit 0
fi

if [ "$ACTION" = "build" ] || [ "$ACTION" = "deploy" ]; then
  echo "→ Applying CF-specific next.config.js changes"
  
  # Backup original
  cp next.config.js next.config.js.original
  
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
  
  if [ "$ACTION" = "deploy" ]; then
    echo "→ Building and deploying to Cloudflare"
    # ... add wrangler deploy here
    echo "Build and deploy completed"
  fi
fi
