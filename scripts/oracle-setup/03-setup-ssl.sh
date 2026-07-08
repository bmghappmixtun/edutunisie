#!/bin/bash
# ============================================================================
# 03-setup-ssl.sh
# Configure Nginx reverse proxy + Let's Encrypt SSL
# Usage: sudo ./03-setup-ssl.sh search.examanet.com
# ============================================================================

set -e

DOMAIN=${1:-}
if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <domain>"
  echo "Example: $0 search.examanet.com"
  exit 1
fi

echo "=========================================="
echo " Setting up SSL for $DOMAIN"
echo "=========================================="

echo ""
echo " 1. Pre-requisite: DNS A record for $DOMAIN must point to this server's public IP"
PUBLIC_IP=$(curl -s ifconfig.me)
echo "  Server public IP: $PUBLIC_IP"
echo "  Make sure $DOMAIN → $PUBLIC_IP (configure in your DNS provider)"
echo ""
echo "  Press Enter to continue once DNS is configured, Ctrl+C to abort"
read -r

echo ""
echo "=========================================="
echo " 2. Configuring Nginx"
echo "=========================================="
cat > /etc/nginx/sites-available/meilisearch << EOF
# Rate limit zone (shared between requests)
limit_req_zone \$binary_remote_addr zone=meili_limit:10m rate=30r/s;

# Upstream Meilisearch (localhost)
upstream meilisearch_backend {
  server 127.0.0.1:7700;
  keepalive 32;
}

# HTTP → HTTPS redirect
server {
  listen 80;
  listen [::]:80;
  server_name $DOMAIN;

  location /.well-known/acme-challenge/ {
    root /var/www/html;
  }

  location / {
    return 301 https://\$host\$request_uri;
  }
}

# HTTPS server
server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name $DOMAIN;

  # SSL (will be configured by certbot)
  ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

  # Security headers
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "no-referrer-when-downgrade" always;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

  # Hide Meilisearch server header
  proxy_hide_header X-Meilisearch-Version;

  # Request size limit (50MB for big docs)
  client_max_body_size 50M;

  # Gzip
  gzip on;
  gzip_vary on;
  gzip_proxied any;
  gzip_comp_level 6;
  gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;

  # Logs
  access_log /var/log/nginx/meilisearch.access.log;
  error_log /var/log/nginx/meilisearch.error.log;

  # Proxy to Meilisearch
  location / {
    # Rate limit (allow burst)
    limit_req zone=meili_limit burst=60 nodelay;

    # Proxy
    proxy_pass http://meilisearch_backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-Host \$host;

    # Timeouts
    proxy_connect_timeout 5s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Buffering
    proxy_buffering on;
    proxy_buffer_size 16k;
    proxy_buffers 4 32k;
    proxy_busy_buffers_size 64k;
  }

  # Health check (no rate limit, no logs)
  location /health {
    access_log off;
    proxy_pass http://meilisearch_backend;
  }
}
EOF

ln -sf /etc/nginx/sites-available/meilisearch /etc/nginx/sites-enabled/meilisearch
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

echo "  ✓ Nginx configured"

echo ""
echo "=========================================="
echo " 3. Obtaining SSL certificate"
echo "=========================================="
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email

echo ""
echo "=========================================="
echo " 4. Setting up auto-renewal"
echo "=========================================="
systemctl enable certbot.timer
systemctl start certbot.timer
echo "  ✓ Certbot auto-renewal enabled"

echo ""
echo "=========================================="
echo " 5. Setting up daily snapshot"
echo "=========================================="
mkdir -p /var/lib/meilisearch/snapshots
chown -R meilisearch:meilisearch /var/lib/meilisearch

# Daily snapshot at 3am
cat > /etc/cron.daily/meili-snapshot << 'EOF'
#!/bin/bash
MEILI_KEY=$(cat /root/.meili-master-key)
RESULT=$(curl -s -X POST -H "Authorization: Bearer $MEILI_KEY" http://127.0.0.1:7700/snapshots)
echo "$(date): $RESULT" >> /var/log/meili-snapshots.log
# Keep only 7 latest snapshots
ls -t /var/lib/meilisearch/snapshots/*.snapshot 2>/dev/null | tail -n +8 | xargs -r rm
EOF
chmod +x /etc/cron.daily/meili-snapshot
echo "  ✓ Daily snapshot cron created"

echo ""
echo "=========================================="
echo "✅ SSL configured for https://$DOMAIN"
echo ""
echo "Test it:"
echo "  curl https://$DOMAIN/health"
echo "=========================================="