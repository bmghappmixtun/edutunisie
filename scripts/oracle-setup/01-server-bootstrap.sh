#!/bin/bash
# ============================================================================
# 01-server-bootstrap.sh
# Bootstrap Oracle Cloud ARM instance for Meilisearch
# Run as root (sudo -i) on a fresh Ubuntu 22.04 ARM instance
# ============================================================================

set -e

echo "=========================================="
echo " 1. Updating system packages"
echo "=========================================="
apt update && apt upgrade -y

echo ""
echo "=========================================="
echo " 2. Installing dependencies"
echo "=========================================="
apt install -y curl wget git ufw nginx certbot python3-certbot-nginx fail2ban htop ncdu

echo ""
echo "=========================================="
echo " 3. Setting up firewall (UFW)"
echo "=========================================="
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment "SSH"
ufw allow 80/tcp comment "HTTP (Let's Encrypt)"
ufw allow 443/tcp comment "HTTPS (Meilisearch)"
# Open Meilisearch on localhost only (behind nginx)
# 7700 stays closed externally
ufw --force enable
ufw status verbose

echo ""
echo "=========================================="
echo " 4. Setting up timezone"
echo "=========================================="
timedatectl set-timezone Europe/Paris

echo ""
echo "=========================================="
echo " 5. Configuring fail2ban"
echo "=========================================="
systemctl enable fail2ban
systemctl start fail2ban

echo ""
echo "=========================================="
echo " 6. Creating meilisearch user"
echo "=========================================="
useradd -r -s /usr/sbin/nologin -d /var/lib/meilisearch meilisearch || echo "User already exists"
mkdir -p /var/lib/meilisearch
chown -R meilisearch:meilisearch /var/lib/meilisearch
chmod 750 /var/lib/meilisearch

echo ""
echo "=========================================="
echo " 7. Configuring swap (1GB for safety)"
echo "=========================================="
if [ ! -f /swapfile ]; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "  ✓ 1GB swap created"
else
  echo "  ✓ Swap already exists"
fi

echo ""
echo "=========================================="
echo " 8. Setting kernel parameters"
echo "=========================================="
cat >> /etc/sysctl.conf << 'EOF'
# Meilisearch optimizations
vm.swappiness=10
net.core.somaxconn=1024
EOF
sysctl -p

echo ""
echo "=========================================="
echo "✅ Bootstrap complete!"
echo "Next step: ./02-install-meilisearch.sh"
echo "=========================================="