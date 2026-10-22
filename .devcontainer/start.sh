#!/usr/bin/env bash
# Starts the website inside GitHub Codespaces and makes it public.
cd "$(dirname "$0")/.."
mkdir -p /workspaces/gvu-data
if [ ! -f /workspaces/gvu-data/.env ]; then
  SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  PASS=$(node -e "console.log('Rgv-'+require('crypto').randomBytes(6).toString('hex'))")
  printf 'JWT_SECRET=%s\nADMIN_EMAIL=admin@goldenvisauae.ai\nADMIN_PASSWORD=%s\n' "$SECRET" "$PASS" > /workspaces/gvu-data/.env
fi
set -a; . /workspaces/gvu-data/.env; set +a
export NEXT_PUBLIC_SITE_URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
# Get the latest code from GitHub (only when there are no local edits) and rebuild when it changed
git checkout -- next-env.d.ts 2>/dev/null || true  # rewritten by every build
if git diff --quiet 2>/dev/null && git diff --cached --quiet 2>/dev/null; then
  git pull --ff-only origin "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)" || echo "[start] git pull skipped"
fi
HEAD_SHA=$(git rev-parse HEAD 2>/dev/null || echo none)
if [ ! -d .next ] || [ "$(cat /workspaces/gvu-data/.built-sha 2>/dev/null)" != "$HEAD_SHA" ]; then
  echo "[start] building version $HEAD_SHA ..."
  npm install --no-audit --no-fund && npm run build && echo "$HEAD_SHA" > /workspaces/gvu-data/.built-sha
fi
# stop the old website server (whatever is holding port 3000) before starting the new one
pkill -f "next start" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
for i in 1 2 3 4 5; do (exec 3<>/dev/tcp/127.0.0.1/3000) 2>/dev/null || break; sleep 1; done
# fully detached: keeps running after the editor / terminal is closed
setsid nohup npm start > /workspaces/gvu-data/server.log 2>&1 < /dev/null &
gh codespace ports visibility 3000:public -c "$CODESPACE_NAME" >/dev/null 2>&1 || true
cat > ADMIN-LOGIN.txt <<TXT
YOUR WEBSITE IS RUNNING
=======================
Website (front):   $NEXT_PUBLIC_SITE_URL
Admin dashboard:   $NEXT_PUBLIC_SITE_URL/admin
Client login:      $NEXT_PUBLIC_SITE_URL/login

Admin email:       $ADMIN_EMAIL
Admin password:    $ADMIN_PASSWORD
(change it after login: Admin -> My profile)

The first start takes about 1 minute. If the link shows an error, wait and refresh.
TXT
cat ADMIN-LOGIN.txt
