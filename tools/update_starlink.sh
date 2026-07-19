#!/usr/bin/env bash
# Daily Starlink snapshot -> data/satellites.json -> commit + push.
# Run via Hermes cron (no_agent) on the Pi.
set -e
cd /home/nicola/projects/limitless-labs
uv run python tools/fetch_starlink.py
git add data/satellites.json
if ! git diff --cached --quiet; then
  git commit -q -m "chore: daily Starlink snapshot $(date -u +%Y-%m-%dT%H:%MZ)"
  git push origin master
  echo "pushed update"
else
  echo "no change"
fi
