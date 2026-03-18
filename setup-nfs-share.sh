#!/bin/bash
set -e

echo "=== Setting up NFS share for /home/jeff/teamhq ==="

# Install NFS server
sudo apt install -y nfs-kernel-server

# Add export (skip if already present)
EXPORT_LINE='/home/jeff/teamhq 192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)'
if grep -qF '/home/jeff/teamhq' /etc/exports 2>/dev/null; then
  echo "Export already exists in /etc/exports, skipping."
else
  echo "$EXPORT_LINE" | sudo tee -a /etc/exports
fi

# Apply exports and start service
sudo exportfs -ra
sudo systemctl enable --now nfs-server

# Open firewall if ufw is active
if sudo ufw status | grep -q "active"; then
  sudo ufw allow from 192.168.1.0/24 to any port nfs
  echo "Firewall rule added."
else
  echo "ufw not active, skipping firewall rule."
fi

echo ""
echo "=== Done! ==="
echo "On your other computer, run:"
echo "  sudo mkdir -p /mnt/teamhq"
echo "  sudo mount 192.168.1.184:/home/jeff/teamhq /mnt/teamhq"
