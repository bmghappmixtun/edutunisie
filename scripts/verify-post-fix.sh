#!/bin/bash
# Post-incident verification script
# Run this to confirm all the monitoring infrastructure is in place
# Usage: bash scripts/verify-post-fix.sh

set -e
echo "=== Examanet post-incident verification ==="
echo ""

# Check site is up
echo "1. Site status"
SITE_STATUS=$(curl -sI "https://examanet.com/fr" --max-time 10 2>&1 | head -1 | tr -d '\r\n')
echo "   /fr: $SITE_STATUS"
echo ""

# Check /api/health (fail-soft)
echo "2. /api/health (fail-soft format)"
HEALTH=$(curl -s "https://examanet.com/api/health" --max-time 10 2>&1)
echo "   $HEALTH"
DB_OK=$(echo "$HEALTH" | python3 -c "import json,sys; print(json.load(sys.stdin).get('db',{}).get('ok','?'))" 2>/dev/null)
echo "   db.ok = $DB_OK"
echo ""

# Check /api/health/strict
echo "3. /api/health/strict (old behavior)"
curl -s "https://examanet.com/api/health/strict" --max-time 10 2>&1 | head -1
echo ""

# Check /api/cron/db-monitor
echo "4. /api/cron/db-monitor (requires CRON_SECRET)"
# Try without auth first to verify it exists
NO_AUTH=$(curl -sI "https://examanet.com/api/cron/db-monitor" --max-time 10 2>&1 | head -1 | tr -d '\r\n')
echo "   No auth: $NO_AUTH (should be 401)"
# Then with auth (we don't have the real token here, so we can't test)
echo ""

# Check log-drain fail-soft
echo "5. /api/log-drain fail-soft"
LOG_DRAIN=$(curl -s "https://examanet.com/api/log-drain?token=${SEED_TOKEN:-}" -X POST -H "Content-Type: application/json" -d '[]' --max-time 10 2>&1)
echo "   $LOG_DRAIN"
echo ""

# Check Vercel env was updated
echo "6. Vercel env DATABASE_URL updated"
export VERCEL_TOKEN="${VERCEL_TOKEN:-}"
python3 -c "
import json
import urllib.request
req = urllib.request.Request(
    'https://api.vercel.com/v9/projects/prj_tTEX1jjkXZo7XcCyFH6IU6DxuI0B',
    headers={'Authorization': 'Bearer $VERCEL_TOKEN'}
)
data = json.loads(urllib.request.urlopen(req, timeout=10).read())
for env in data.get('env', []):
    if env.get('key') == 'DATABASE_URL' and 'production' in (env.get('target') or []):
        import datetime
        ts = env.get('updatedAt', 0) / 1000
        print(f\"   Updated: {datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S UTC')}\")
"
echo ""

# Check Neon endpoint is reachable
echo "7. Neon DB reachability"
PGPASSWORD=$(grep "DATABASE_URL" .env.local | sed 's|.*://[^:]*:\([^@]*\)@.*|\1|')
PG_HOST=$(grep "DATABASE_URL" .env.local | sed 's|.*@\([^/]*\)/.*|\1|')
timeout 5 node -e "
const { Client } = require('pg');
const url = process.env.DATABASE_URL || '$(grep DATABASE_URL .env.local | head -1 | sed 's/^DATABASE_URL=//' | tr -d '"')';
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 3000 });
c.connect()
  .then(() => { console.log('   OK: connected'); c.end(); })
  .catch(e => { console.log('   FAILED:', e.message); process.exit(1); });
" 2>/dev/null
echo ""

echo "=== Verification complete ==="
echo ""
echo "If anything looks wrong, check:"
echo "  - Vercel function logs: https://vercel.com/boutitimehdi-6668s-projects/edutunisie/logs"
echo "  - Neon console: https://console.neon.tech"
echo "  - Discord channel for db-monitor alerts"
