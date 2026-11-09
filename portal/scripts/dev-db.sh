#!/usr/bin/env bash
# Creates roles and the dev and test databases (local Postgres), then migrates them.
set -euo pipefail
cd "$(dirname "$0")/.."
SU="su postgres -c"
$SU "psql -v ON_ERROR_STOP=1 -q" <<'SQL'
do $$ begin
  if not exists (select from pg_roles where rolname = 'livedock_owner') then
    create role livedock_owner login password 'owner' createdb;
  end if;
  if not exists (select from pg_roles where rolname = 'livedock_app') then
    create role livedock_app login password 'app' nosuperuser nobypassrls;
  end if;
end $$;
SQL
for db in livedock_dev livedock_test; do
  $SU "psql -tAc \"select 1 from pg_database where datname='$db'\"" | grep -q 1 || \
    $SU "psql -c \"create database $db owner livedock_owner\""
  $SU "psql -d $db -q -c 'create extension if not exists citext; create extension if not exists pgcrypto;'"
  DATABASE_ADMIN_URL="postgres://livedock_owner:owner@localhost:5432/$db" node scripts/migrate.ts
done
echo "ok: livedock_dev and livedock_test ready"
