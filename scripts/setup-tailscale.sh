#!/usr/bin/env bash
# setup-tailscale.sh — install and bring up Tailscale on Debian / Raspberry Pi OS
# Tested: Raspberry Pi 3 Model B+, Debian 12 (bookworm), aarch64
set -euo pipefail

echo ">> Installing Tailscale..."
curl -fsSL https://tailscale.com/install.sh | sh

echo ">> Enabling Tailscale at boot..."
sudo systemctl enable --now tailscaled

echo ">> Bringing up Tailscale (interactive login)..."
sudo tailscale up

echo ">> Your Tailscale IP:"
tailscale ip -4 2>/dev/null || tailscale status | head -1

echo ">> Done. From any other Tailscale device, connect to the IP above."
