#!/usr/bin/env bash
# backup-pi.sh — low-overhead rsync backup for a Raspberry Pi
# Usage: bash backup-pi.sh /mnt/backup
set -euo pipefail

DEST="${1:?Usage: backup-pi.sh /path/to/backup}"
mkdir -p "$DEST"

echo ">> Backing up /etc ..."
rsync -aAX --delete /etc/ "$DEST/etc/" --exclude=/etc/fstab

echo ">> Backing up /home/pi ..."
rsync -aAX --delete /home/pi/ "$DEST/home-pi/"

echo ">> Backing up current project ..."
rsync -aAX --delete "$(dirname "$0")/.." "$DEST/pi-selfhost-kit/"

echo ">> Backup complete at $(date): $DEST"
