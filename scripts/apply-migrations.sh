#!/bin/bash

# Script to apply Supabase migrations

echo "Applying Supabase migrations..."

# Get Supabase URL and key from environment or .env file
if [ -f .env ]; then
  source .env
fi

# Ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment or .env file."
  exit 1
fi

# Extract project reference from URL
# Example: https://kcfsqlbixvxotjtddhhl.supabase.co -> kcfsqlbixvxotjtddhhl
PROJECT_REF=$(echo $SUPABASE_URL | sed -E 's/https:\/\/([^.]+).supabase.co.*/\1/')

if [ -z "$PROJECT_REF" ]; then
  echo "Error: Could not extract project reference from URL."
  exit 1
fi

echo "Project reference: $PROJECT_REF"

# Migration SQL file
MIGRATION_FILE="supabase/migrations/20230811000000_add_localization_to_lessons.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "Migration file not found: $MIGRATION_FILE"
  exit 1
fi

# Create a temporary file for JSON payload
TEMP_FILE=$(mktemp)

# Create properly escaped JSON payload using Python
python3 -c "
import json
import sys

with open('$MIGRATION_FILE', 'r') as f:
    sql_content = f.read()

payload = json.dumps({'query': sql_content})
with open('$TEMP_FILE', 'w') as f:
    f.write(payload)
"

if [ $? -ne 0 ]; then
  echo "Error creating JSON payload. Trying alternative method..."
  
  # Alternative method using Node.js if Python is not available
  node -e "
  const fs = require('fs');
  const sql = fs.readFileSync('$MIGRATION_FILE', 'utf8');
  const payload = JSON.stringify({query: sql});
  fs.writeFileSync('$TEMP_FILE', payload);
  "
  
  if [ $? -ne 0 ]; then
    echo "Error: Could not create properly escaped JSON payload."
    rm -f "$TEMP_FILE"
    exit 1
  fi
fi

echo "Created JSON payload. Sending to Supabase Management API..."

# Use Supabase Management API to execute the SQL directly
RESPONSE=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/sql" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d @"$TEMP_FILE")

# Clean up temp file
rm -f "$TEMP_FILE"

echo "Response: $RESPONSE"

if [[ "$RESPONSE" == *"error"* ]]; then
  echo "Error applying migration: $RESPONSE"
  exit 1
fi

echo "Migration completed successfully!" 