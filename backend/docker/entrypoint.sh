#!/bin/sh
set -eu

resolve_from_connection_string() {
  conn="$1"
  clean="${conn#postgresql://}"
  clean="${clean#postgres://}"
  host_and_path="${clean#*@}"
  host_port="${host_and_path%%/*}"
  db_with_query="${host_and_path#*/}"
  db_name_from_conn="${db_with_query%%\?*}"

  host="${host_port%%:*}"
  port="${host_port##*:}"
  if [ "$port" = "$host_port" ]; then
    port="5432"
  fi

  db_name="${DB_NAME:-$db_name_from_conn}"

  export SPRING_DATASOURCE_URL="jdbc:postgresql://${host}:${port}/${db_name}"
}

connection_string="${DB_CONNECTION:-${DB_URL:-${DATABASE_URL:-}}}"
if [ -z "${SPRING_DATASOURCE_URL:-}" ] && [ -n "$connection_string" ]; then
  resolve_from_connection_string "$connection_string"
fi

if [ -z "${SPRING_DATASOURCE_USERNAME:-}" ] && [ -n "${DB_USERNAME:-}" ]; then
  export SPRING_DATASOURCE_USERNAME="${DB_USERNAME}"
fi

if [ -z "${SPRING_DATASOURCE_PASSWORD:-}" ] && [ -n "${DB_PASSWORD:-}" ]; then
  export SPRING_DATASOURCE_PASSWORD="${DB_PASSWORD}"
fi

exec java -jar app.jar
