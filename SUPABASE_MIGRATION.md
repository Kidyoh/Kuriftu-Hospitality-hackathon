# Supabase Database Migration Guide

This guide provides instructions for applying database migrations to add multi-language content support to the learning platform.

## What's Included in the Migration

This migration adds the following columns to the `course_lessons` table:

- `content_en`: Text content in English
- `content_am`: Text content in Amharic
- `content_or`: Text content in Oromiffa (Oromo language)

It also creates appropriate security policies to ensure content is properly protected.

## Option 1: Using Supabase CLI (Recommended)

If you have the Supabase CLI installed, you can apply migrations with:

```bash
supabase db push
```

## Option 2: Using the Migration Script

We've provided a script that will apply the migrations:

```bash
# Make sure the script is executable
chmod +x scripts/apply-migrations.sh

# Run the script
./scripts/apply-migrations.sh
```

## Option 3: Manual Execution in SQL Editor

You can also apply the migration manually by:

1. Go to the Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase/migrations/20230811000000_add_localization_to_lessons.sql`
4. Execute the SQL

## Verifying the Migration

After applying the migration, you can verify it worked by checking if the columns exist:

```sql
SELECT 
  column_name, 
  data_type 
FROM 
  information_schema.columns 
WHERE 
  table_name = 'course_lessons' 
AND 
  column_name IN ('content_en', 'content_am', 'content_or');
```

## Troubleshooting

If you encounter issues:

1. Check the Supabase database logs for any error messages
2. Ensure you have the correct permissions to modify the database schema
3. Verify your Supabase connection settings

## Rollback

If needed, you can rollback the changes with:

```sql
ALTER TABLE course_lessons DROP COLUMN IF EXISTS content_en;
ALTER TABLE course_lessons DROP COLUMN IF EXISTS content_am;
ALTER TABLE course_lessons DROP COLUMN IF EXISTS content_or;

DROP POLICY IF EXISTS "Admins can do anything with lessons" ON course_lessons;
DROP POLICY IF EXISTS "Staff can view lessons" ON course_lessons;

DROP INDEX IF EXISTS idx_course_lessons_course_id;
``` 