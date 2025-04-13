#!/bin/bash
# Script to run the direct_fix.sql file to fix specific problematic quiz options

# Exit on any error
set -e

# Set up variables
DB_NAME=${1:-postgres}
DB_HOST=${2:-localhost}
DB_PORT=${3:-5432}
DB_USER=${4:-postgres}

# Prompt for password
read -sp "Enter database password: " DB_PASSWORD
echo

# Run the SQL script
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f sql/direct_fix.sql

# Output completion message
echo "Direct fix completed. Check the output for any errors." 