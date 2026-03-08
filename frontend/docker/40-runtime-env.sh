#!/bin/sh
set -eu

API_ORIGIN="${API_ORIGIN:-http://localhost:8080}"
API_ORIGIN="${API_ORIGIN%/}"
API_BASE_URL="${API_BASE_URL:-$API_ORIGIN/api}"
UPLOAD_BASE_URL="${UPLOAD_BASE_URL:-$API_ORIGIN}"

cat > /usr/share/nginx/html/env.js <<EOF
window.__env = {
  apiBaseUrl: "${API_BASE_URL}",
  uploadBaseUrl: "${UPLOAD_BASE_URL}"
};
EOF
