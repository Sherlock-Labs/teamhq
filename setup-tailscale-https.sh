#!/usr/bin/env bash
set -euo pipefail

DOMAIN="thinkcentre.tail560767.ts.net"
CERTS_DIR="$(dirname "$0")/server/certs"

mkdir -p "$CERTS_DIR"

echo "Setting Tailscale operator to $USER..."
sudo tailscale set --operator="$USER"

echo "Provisioning TLS cert for $DOMAIN..."
tailscale cert \
  --cert-file "$CERTS_DIR/$DOMAIN.crt" \
  --key-file "$CERTS_DIR/$DOMAIN.key" \
  "$DOMAIN"

echo "Done. Certs written to $CERTS_DIR/"
echo "Restart 'npm run dev' to enable HTTPS."
