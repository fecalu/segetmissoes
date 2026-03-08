#!/bin/sh
set -eu

if [ -n "${API_BASE_URL:-}" ] || [ -n "${API_ORIGIN:-}" ] || [ -n "${UPLOAD_BASE_URL:-}" ]; then
  API_ORIGIN="${API_ORIGIN:-}"
  API_ORIGIN="${API_ORIGIN%/}"

  if [ -z "${API_BASE_URL:-}" ] && [ -n "$API_ORIGIN" ]; then
    API_BASE_URL="${API_ORIGIN}/api"
  fi
  if [ -z "${UPLOAD_BASE_URL:-}" ] && [ -n "$API_ORIGIN" ]; then
    UPLOAD_BASE_URL="$API_ORIGIN"
  fi

  cat > /usr/share/nginx/html/env.js <<EOF
window.__env = {
  apiBaseUrl: "${API_BASE_URL:-}",
  uploadBaseUrl: "${UPLOAD_BASE_URL:-}"
};
EOF
else
  cat > /usr/share/nginx/html/env.js <<EOF
window.__env = {};
EOF
fi
