#!/usr/bin/env bash
set -e

DB_NAME="mindful_plate"
DB_USER="mindful_user"
DB_PASS="mindful_secure_pass_123!"

echo "Creating PostgreSQL user and database for Mindful Plate..."
sudo -u postgres psql << SQL
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
      CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS';
   ELSE
      ALTER ROLE $DB_USER WITH PASSWORD '$DB_PASS';
   END IF;
END
\$\$;

SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
SQL

echo "Database '$DB_NAME' and user '$DB_USER' successfully set up!"
