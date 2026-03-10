#!/bin/sh
set -eu

log() {
  echo "[entrypoint] $*"
}

resolve_from_connection_string() {
  conn="$1"

  # Accept postgres://, postgresql:// and jdbc:postgresql://
  clean="${conn#jdbc:}"
  clean="${clean#postgresql://}"
  clean="${clean#postgres://}"

  credentials_and_host="$clean"
  has_credentials="false"
  if [ "${credentials_and_host#*@}" != "$credentials_and_host" ]; then
    has_credentials="true"
  fi

  if [ "$has_credentials" = "true" ]; then
    credentials="${credentials_and_host%%@*}"
    host_and_path="${credentials_and_host#*@}"
  else
    credentials=""
    host_and_path="$credentials_and_host"
  fi

  host_port="${host_and_path%%/*}"
  path_and_query="${host_and_path#*/}"
  db_name_from_conn="${path_and_query%%\?*}"
  query=""
  if [ "${path_and_query#*\?}" != "$path_and_query" ]; then
    query="?${path_and_query#*\?}"
  fi

  host="${host_port%%:*}"
  port="${host_port##*:}"
  if [ "$port" = "$host_port" ]; then
    port="5432"
  fi

  db_name="${DB_NAME:-${PGDATABASE:-$db_name_from_conn}}"
  export SPRING_DATASOURCE_URL="jdbc:postgresql://${host}:${port}/${db_name}${query}"

  if [ -z "${SPRING_DATASOURCE_USERNAME:-}" ] && [ -n "$credentials" ]; then
    parsed_user="${credentials%%:*}"
    export SPRING_DATASOURCE_USERNAME="$parsed_user"
  fi

  if [ -z "${SPRING_DATASOURCE_PASSWORD:-}" ] && [ -n "$credentials" ] && [ "${credentials#*:}" != "$credentials" ]; then
    parsed_password="${credentials#*:}"
    export SPRING_DATASOURCE_PASSWORD="$parsed_password"
  fi

  log "Database URL resolved from connection string to host=${host} port=${port} db=${db_name}"
}

if [ -z "${SPRING_DATASOURCE_URL:-}" ]; then
  connection_string="${DB_CONNECTION:-${DB_URL:-${DATABASE_URL:-}}}"
  if [ -n "$connection_string" ]; then
    resolve_from_connection_string "$connection_string"
  elif [ -n "${PGHOST:-}" ]; then
    export SPRING_DATASOURCE_URL="jdbc:postgresql://${PGHOST}:${PGPORT:-5432}/${PGDATABASE:-frota_db}"
    log "Database URL resolved from PGHOST/PGPORT/PGDATABASE"
  elif [ -n "${DB_HOST:-}" ]; then
    export SPRING_DATASOURCE_URL="jdbc:postgresql://${DB_HOST}:${DB_PORT:-5432}/${DB_NAME:-frota_db}"
    log "Database URL resolved from DB_HOST/DB_PORT/DB_NAME"
  else
    log "Database env vars were not found. Spring will fallback to application defaults."
  fi
fi

if [ -z "${SPRING_DATASOURCE_USERNAME:-}" ]; then
  if [ -n "${DB_USERNAME:-}" ]; then
    export SPRING_DATASOURCE_USERNAME="${DB_USERNAME}"
  elif [ -n "${PGUSER:-}" ]; then
    export SPRING_DATASOURCE_USERNAME="${PGUSER}"
  fi
fi

if [ -z "${SPRING_DATASOURCE_PASSWORD:-}" ]; then
  if [ -n "${DB_PASSWORD:-}" ]; then
    export SPRING_DATASOURCE_PASSWORD="${DB_PASSWORD}"
  elif [ -n "${PGPASSWORD:-}" ]; then
    export SPRING_DATASOURCE_PASSWORD="${PGPASSWORD}"
  fi
fi

if [ -n "${SPRING_DATASOURCE_URL:-}" ]; then
  log "Using SPRING_DATASOURCE_URL from runtime env/bootstrap."
fi

resolved_port="${PORT:-${SERVER_PORT:-8080}}"
resolved_address="${SERVER_ADDRESS:-0.0.0.0}"
log "Starting API at ${resolved_address}:${resolved_port}"

exec java \
  -Dserver.address="${resolved_address}" \
  -Dserver.port="${resolved_port}" \
  -jar app.jar
