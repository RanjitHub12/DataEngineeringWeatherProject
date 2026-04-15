#!/bin/bash
# ============================================================================
# Airflow Entrypoint Script
# ============================================================================
# This script:
# 1. Waits for the Airflow metadata database to be ready
# 2. Initializes the Airflow database
# 3. Creates a default admin user
# 4. Starts the Airflow service (webserver or scheduler)
# ============================================================================

set -e

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL Airflow database to be ready..."
while ! nc -z $AIRFLOW_DB_HOST 5432; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
done
echo "✓ PostgreSQL is ready!"

# Initialize Airflow database if not already done
echo "Initializing Airflow database..."
airflow db migrate || true
airflow db init || true

# Create admin user if it doesn't exist (only for webserver)
if [[ "$1" == "webserver" ]]; then
    echo "Creating Airflow admin user..."
    airflow users create \
        --username ${AIRFLOW__WEBSERVER__DEFAULT_USER_USERNAME:-airflow} \
        --firstname Admin \
        --lastname User \
        --role Admin \
        --email ${AIRFLOW_ADMIN_EMAIL:-admin@example.com} \
        --password ${AIRFLOW__WEBSERVER__DEFAULT_USER_PASSWORD:-airflow} \
        || echo "Admin user already exists"
fi

# Execute the passed command (webserver or scheduler)
echo "Starting Airflow $1..."
exec airflow "$@"
