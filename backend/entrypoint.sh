#!/bin/sh
set -e

echo 'Waiting for database...'
until python -c "
import os, sys, time
import psycopg2
url = os.environ.get('DATABASE_URL', '')
for i in range(30):
    try:
        psycopg2.connect(url)
        sys.exit(0)
    except Exception:
        time.sleep(1)
sys.exit(1)
"; do
  sleep 1
done

echo 'Running migrations...'
alembic upgrade head

echo 'Starting app...'
exec "$@"
