#!/bin/bash
# ============================================================================
# 02-install-meilisearch.sh
# Install Meilisearch as a systemd service
# Run as root
# ============================================================================

set -e

echo "=========================================="
echo " 1. Downloading Meilisearch v1.10.0"
echo "=========================================="
cd /tmp
curl -L https://github.com/meilisearch/meilisearch/releases/download/v1.10.0/meilisearch-linux-aarch64 \
  -o meilisearch
chmod +x meilisearch
mv meilisearch /usr/local/bin/meilisearch
meilisearch --version

echo ""
echo "=========================================="
echo " 2. Generating master key"
echo "=========================================="
MEILI_MASTER_KEY=$(openssl rand -hex 32)
echo ""
echo "  ⚠️  SAVE THIS KEY SECURELY (e.g., password manager):"
echo "  $MEILI_MASTER_KEY"
echo ""
echo "$MEILI_MASTER_KEY" > /root/.meili-master-key
chmod 600 /root/.meili-master-key
echo "  ✓ Key saved to /root/.meili-master-key (read-only)"

echo ""
echo "=========================================="
echo " 3. Creating systemd service"
echo "=========================================="
cat > /etc/systemd/system/meilisearch.service << EOF
[Unit]
Description=Meilisearch
After=network.target

[Service]
Type=simple
User=meilisearch
Group=meilisearch
WorkingDirectory=/var/lib/meilisearch
Environment="MEILI_MASTER_KEY=$MEILI_MASTER_KEY"
Environment="MEILI_NO_ANALYTICS=true"
Environment="MEILI_ENV=production"
Environment="MEILI_DB_PATH=/var/lib/meilisearch/data.ms"
Environment="MEILI_HTTP_ADDR=127.0.0.1:7700"
Environment="MEILI_DUMP_DIR=/var/lib/meilisearch/dumps"
Environment="MEILI_SNAPSHOT_DIR=/var/lib/meilisearch/snapshots"
ExecStart=/usr/local/bin/meilisearch
Restart=always
RestartSec=3
LimitNOFILE=65536
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/var/lib/meilisearch

[Install]
WantedBy=multi-user.target
EOF

echo "  ✓ Service file created"

echo ""
echo "=========================================="
echo " 4. Starting Meilisearch"
echo "=========================================="
systemctl daemon-reload
systemctl enable meilisearch
systemctl start meilisearch

echo ""
echo "Waiting for service to be ready..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -s http://127.0.0.1:7700/health > /dev/null 2>&1; then
    echo "  ✓ Meilisearch ready after ${i}s"
    break
  fi
  sleep 1
done

echo ""
echo "=========================================="
echo " 5. Health check"
echo "=========================================="
curl -s http://127.0.0.1:7700/health
echo ""
systemctl status meilisearch --no-pager -l

echo ""
echo "=========================================="
echo "✅ Meilisearch installed and running!"
echo "Master key: $(cat /root/.meili-master-key)"
echo "Listening on: 127.0.0.1:7700 (localhost only)"
echo ""
echo "Next step: ./03-setup-ssl.sh <your-domain>"
echo "=========================================="