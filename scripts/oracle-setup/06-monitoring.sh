#!/bin/bash
# ============================================================================
# 06-monitoring.sh
# Setup monitoring + alerts for Meilisearch on Oracle Cloud
# Run as root
# ============================================================================

set -e

echo "=========================================="
echo " Setting up Meilisearch monitoring"
echo "=========================================="

# 1. Health check cron (every 5 min)
echo ""
echo "1. Health check cron..."
cat > /etc/cron.d/meili-health << 'EOF'
# Health check Meilisearch every 5 minutes
*/5 * * * * root /usr/local/bin/meili-health-check.sh >> /var/log/meili-health.log 2>&1
EOF

cat > /usr/local/bin/meili-health-check.sh << 'EOF'
#!/bin/bash
RESPONSE=$(curl -s -o /tmp/meili-health.json -w "%{http_code}" http://127.0.0.1:7700/health)
if [ "$RESPONSE" != "200" ]; then
  echo "[$(date)] ⚠️ Meilisearch health check FAILED: HTTP $RESPONSE"
  # Try to restart
  systemctl restart meilisearch
  echo "[$(date)] Attempted restart"
  # Optional: send alert
  # curl -X POST https://ntfy.sh/examanet-alerts -d "Meilisearch down, restart attempted"
else
  STATUS=$(cat /tmp/meili-health.json | python3 -c "import json,sys; print(json.load(sys.stdin)['status'])" 2>/dev/null)
  if [ "$STATUS" != "available" ]; then
    echo "[$(date)] ⚠️ Meilisearch status: $STATUS"
  fi
fi
EOF
chmod +x /usr/local/bin/meili-health-check.sh
echo "  ✓ Health check cron installed"

# 2. Disk space monitoring
echo ""
echo "2. Disk space monitoring..."
cat > /etc/cron.daily/meili-disk-check << 'EOF'
#!/bin/bash
USAGE=$(df /var/lib/meilisearch | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$USAGE" -gt 80 ]; then
  echo "[$(date)] ⚠️ Meilisearch disk usage: ${USAGE}%"
  # Keep only 5 latest snapshots instead of 7
  ls -t /var/lib/meilisearch/snapshots/*.snapshot 2>/dev/null | tail -n +6 | xargs -r rm
fi
EOF
chmod +x /etc/cron.daily/meili-disk-check
echo "  ✓ Disk space monitoring installed"

# 3. Log rotation
echo ""
echo "3. Log rotation..."
cat > /etc/logrotate.d/meilisearch << 'EOF'
/var/log/meili-health.log {
  daily
  rotate 7
  compress
  missingok
  notifempty
  create 644 root root
}

/var/log/meili-snapshots.log {
  weekly
  rotate 4
  compress
  missingok
  notifempty
}
EOF
echo "  ✓ Log rotation configured"

# 4. Stats endpoint for monitoring
echo ""
echo "4. Stats endpoint script..."
cat > /usr/local/bin/meili-stats.sh << 'EOF'
#!/bin/bash
# Returns current Meilisearch stats as JSON
MEILI_KEY=$(cat /root/.meili-master-key)
STATS=$(curl -s -H "Authorization: Bearer $MEILI_KEY" http://127.0.0.1:7700/stats)
echo "$STATS" | python3 -m json.tool
EOF
chmod +x /usr/local/bin/meili-stats.sh
echo "  ✓ Stats script: /usr/local/bin/meili-stats.sh"

# 5. Setup ntfy.sh for free push notifications (optional)
echo ""
echo "5. Push notification setup (optional)..."
echo "  You can subscribe to https://ntfy.sh/examanet-meili-alerts"
echo "  for free push notifications on failures."
echo ""
cat > /usr/local/bin/meili-alert.sh << 'EOF'
#!/bin/bash
# Send push notification via ntfy.sh
MESSAGE=$1
TOPIC=${2:-examanet-meili-alerts}
curl -s -H "Title: Meilisearch Alert" -H "Priority: high" \
  -d "$MESSAGE" "https://ntfy.sh/$TOPIC"
EOF
chmod +x /usr/local/bin/meili-alert.sh
echo "  ✓ Alert script: /usr/local/bin/meili-alert.sh 'message'"

echo ""
echo "=========================================="
echo "✅ Monitoring configured!"
echo ""
echo "  • Health check: every 5 min (auto-restart if down)"
echo "  • Disk check: daily (cleanup if > 80%)"
echo "  • Snapshots: daily at 3am (keep 7)"
echo "  • SSL renewal: automatic (certbot)"
echo "  • Stats: /usr/local/bin/meili-stats.sh"
echo "  • Alerts: /usr/local/bin/meili-alert.sh 'msg'"
echo ""
echo "Optional: subscribe to https://ntfy.sh/examanet-meili-alerts"
echo "for free push notifications on your phone."
echo "=========================================="