#!/usr/bin/env bash
# Update the running website to the newest version on GitHub:
#   bash .devcontainer/update.sh
cd "$(dirname "$0")/.."
git stash --include-untracked -q 2>/dev/null || true
git pull --ff-only origin main
rm -f /workspaces/gvu-data/.built-sha
bash .devcontainer/start.sh
