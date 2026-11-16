#!/usr/bin/env bash
# Temporary demo account for the guide. Adapt the two API calls to your app; keep the password out of
# any repository (it is written to .pw, mode 600). Usage: compte.sh creer | supprimer
set -euo pipefail
cd "$(dirname "$0")"
EMAIL="guide-demo@example.com"
API="https://app.example.com/admin/api"           # your admin API, reachable from the server only
TOKEN="$(cat /etc/myapp/admin-token)"             # read from the server, never written here
case "${1:-}" in
  creer)
    umask 077; PW="$(openssl rand -base64 18 | tr -d '/+=')Aa9"; printf '%s' "$PW" > .pw
    curl -fsS -X POST "$API/users" -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
      -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\",\"role\":\"seller\"}" >/dev/null
    echo "demo account created";;
  supprimer)
    curl -fsS -X DELETE "$API/users/by-email/$EMAIL" -H "authorization: Bearer $TOKEN" >/dev/null || true
    rm -f .pw; echo "demo account deleted";;
  *) echo "usage: compte.sh creer|supprimer"; exit 2;;
esac
