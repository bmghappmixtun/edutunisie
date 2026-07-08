#!/bin/bash
# ============================================================================
# 00-provision.sh
# ONE-CLICK Oracle Cloud provisioning via OCI API
# Requires: ~/.oci/config + .pem key already configured
# ============================================================================

set -e

if [ ! -f "$HOME/.oci/config" ]; then
  echo "❌ ~/.oci/config not found. Read 00-oci-config-guide.md first."
  exit 1
fi

OCI="oci"
COMPARTMENT=$(oci iam compartment list --all --query 'data[?name==`root`].id | [0]' --raw-output 2>/dev/null || echo "")

if [ -z "$COMPARTMENT" ]; then
  echo "❌ Cannot get compartment OCID. Check your OCI config."
  exit 1
fi

echo "=========================================="
echo " Provisioning Meilisearch on Oracle"
echo "=========================================="
echo "Compartment: $COMPARTMENT"
echo ""

# 1. Get Ubuntu 22.04 ARM image
echo "1. Finding Ubuntu 22.04 ARM image..."
IMAGE_ID=$(oci compute image list \
  --compartment-id $COMPARTMENT \
  --operating-system "Canonical Ubuntu" \
  --operating-system-version "22.04" \
  --shape "VM.Standard.A1.Flex" \
  --query 'data[0].id' \
  --raw-output)
echo "  ✓ Image: $IMAGE_ID"

# 2. Get AD
echo "2. Selecting availability domain..."
AD_NAME=$(oci iam availability-domain list \
  --compartment-id $COMPARTMENT \
  --query 'data[0].name' \
  --raw-output)
echo "  ✓ AD: $AD_NAME"

# 3. Create VCN
echo "3. Creating VCN..."
VCN_ID=$(oci network vcn create \
  --compartment-id $COMPARTMENT \
  --cidr-blocks '["10.0.0.0/16"]' \
  --display-name "meili-vcn" \
  --dns-label "meilivcn" \
  --query 'data.id' \
  --raw-output)
echo "  ✓ VCN: $VCN_ID"

# 4. Create Internet Gateway
echo "4. Creating Internet Gateway..."
IG_ID=$(oci network internet-gateway create \
  --compartment-id $COMPARTMENT \
  --vcn-id $VCN_ID \
  --display-name "meili-ig" \
  --is-enabled true \
  --query 'data.id' \
  --raw-output)
echo "  ✓ IG: $IG_ID"

# 5. Create route table
echo "5. Creating route table..."
oci network route-table create \
  --compartment-id $COMPARTMENT \
  --vcn-id $VCN_ID \
  --display-name "meili-rt" \
  --route-rules "[{\"destination\":\"0.0.0.0/0\",\"networkEntityId\":\"$IG_ID\"}]" \
  --query 'data.id' \
  --raw-output > /dev/null
echo "  ✓ Route table created"

# 6. Create security list with our ports
echo "6. Creating security list (SSH, HTTP, HTTPS)..."
SEC_LIST_ID=$(oci network security-list create \
  --compartment-id $COMPARTMENT \
  --vcn-id $VCN_ID \
  --display-name "meili-seclist" \
  --ingress-security-rules '[
    {"source":"0.0.0.0/0","protocol":"6","destinationPortRange":{"min":22,"max":22},"description":"SSH"},
    {"source":"0.0.0.0/0","protocol":"6","destinationPortRange":{"min":80,"max":80},"description":"HTTP"},
    {"source":"0.0.0.0/0","protocol":"6","destinationPortRange":{"min":443,"max":443},"description":"HTTPS"}
  ]' \
  --egress-security-rules '[{"destination":"0.0.0.0/0","protocol":"all"}]' \
  --query 'data.id' \
  --raw-output)
echo "  ✓ Security list: $SEC_LIST_ID"

# 7. Create subnet
echo "7. Creating subnet..."
SUBNET_ID=$(oci network subnet create \
  --compartment-id $COMPARTMENT \
  --vcn-id $VCN_ID \
  --display-name "meili-subnet" \
  --cidr-block "10.0.0.0/24" \
  --dns-label "meilisub" \
  --security-list-ids "[\"$SEC_LIST_ID\"]" \
  --query 'data.id' \
  --raw-output)
echo "  ✓ Subnet: $SUBNET_ID"

# 8. Generate SSH keypair
echo "8. Generating SSH keypair..."
mkdir -p /tmp/meili-ssh
ssh-keygen -t ed25519 -f /tmp/meili-ssh/id_ed25519 -N "" -q
echo "  ✓ SSH key: /tmp/meili-ssh/id_ed25519"
echo ""
echo "  Public key:"
cat /tmp/meili-ssh/id_ed25519.pub
echo ""

# 9. Create instance
echo "9. Creating instance (4 OCPU, 24GB RAM)..."
INSTANCE_ID=$(oci compute instance launch \
  --compartment-id $COMPARTMENT \
  --availability-domain "$AD_NAME" \
  --shape "VM.Standard.A1.Flex" \
  --shape-config '{"ocpus":4,"memoryInGBs":24}' \
  --image-id $IMAGE_ID \
  --subnet-id $SUBNET_ID \
  --display-name "examanet-meili" \
  --assign-public-ip true \
  --metadata "{\"ssh_authorized_keys\":\"$(cat /tmp/meili-ssh/id_ed25519.pub)\"}" \
  --query 'data.id' \
  --raw-output 2>&1)

if [[ $INSTANCE_ID == *"Out of capacity"* ]]; then
  echo "  ⚠️ Out of capacity in $AD_NAME. Try another AD or region."
  exit 1
fi

echo "  ✓ Instance: $INSTANCE_ID"

# 10. Wait for instance to be RUNNING
echo ""
echo "10. Waiting for instance to be RUNNING..."
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  STATE=$(oci compute instance get --instance-id $INSTANCE_ID --query 'data."lifecycle-state"' --raw-output)
  echo "  T+${i}0s: $STATE"
  if [ "$STATE" = "RUNNING" ]; then break; fi
  sleep 10
done

# 11. Get public IP
echo ""
echo "11. Getting public IP..."
PUBLIC_IP=$(oci compute instance list-vnics \
  --instance-id $INSTANCE_ID \
  --query 'data[0]."public-ip"' \
  --raw-output)
echo "  ✓ Public IP: $PUBLIC_IP"

# 12. Save info
cat > /tmp/meili-instance.json << EOF
{
  "instance_id": "$INSTANCE_ID",
  "compartment": "$COMPARTMENT",
  "vcn_id": "$VCN_ID",
  "subnet_id": "$SUBNET_ID",
  "ad": "$AD_NAME",
  "public_ip": "$PUBLIC_IP",
  "ssh_key": "/tmp/meili-ssh/id_ed25519"
}
EOF

echo ""
echo "=========================================="
echo " ✅ INSTANCE READY!"
echo "=========================================="
echo ""
echo "Instance ID: $INSTANCE_ID"
echo "Public IP:   $PUBLIC_IP"
echo "SSH key:     /tmp/meili-ssh/id_ed25519"
echo ""
echo "Next step: 01-server-bootstrap.sh"
echo ""
echo "Wait ~30s for SSH to be ready, then:"
echo "  ssh -i /tmp/meili-ssh/id_ed25519 ubuntu@$PUBLIC_IP"