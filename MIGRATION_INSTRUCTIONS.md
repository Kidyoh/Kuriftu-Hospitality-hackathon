# Migration Instructions for Achievement and Incentive System

## Overview of issues and solutions

The migration scripts address several issues:
1. "relation public.achievements does not exist" error
2. "relation public.user_quiz_results does not exist" error
3. Missing Row-Level Security policies
4. Missing/broken quiz options for questions

These scripts ensure all necessary tables are created with appropriate permissions, achievements are properly tracked, and quiz functionality works correctly.

## Migration Steps

Execute these scripts in the following order:

### Step 1: Ensure base tables exist
```sql
psql -f sql/ensure_base_tables.sql
```
This creates all core tables required by the incentives system (achievements, rewards, user_points, etc.) if they don't already exist.

### Step 2: Set up security policies
```sql
psql -f sql/setup_rls_policies.sql
```
This creates Row-Level Security policies for all incentives tables, ensuring proper access control.

### Step 3: Fix missing tables
```sql
psql -f sql/fix_missing_tables.sql
```
This creates user activity tables (user_quiz_results, user_courses, user_lessons) if they don't exist, and updates achievement tracking functions to check for table existence.

### Step 4: Update achievements
```sql
psql -f sql/update_achievements.sql
```
This ensures the achievements table has all required columns and maps existing data correctly.

### Step 5: Fix quiz options
```sql
psql -f sql/fix_quiz_options_view.sql
psql -f sql/fix_missing_quiz_options.sql
```
This creates a view to identify quiz questions missing options, then automatically adds appropriate options for all multiple-choice and true/false questions that need them.

### Step 6: Add login streak tracking (optional)
```sql
psql -f sql/login_streak_migration.sql
```
This creates a login streak tracking table and sets up achievement criteria based on login streaks.

### Step 7: Refresh achievements (optional)
After running the above scripts, you may want to refresh the achievement progress for all users:
```sql
CALL refresh_all_user_achievements();
```
Or for a specific user:
```sql
CALL refresh_user_achievements('user-id-here');
```

## Troubleshooting

### Schema and Permission Issues
- If you encounter permissions errors, ensure you're connecting as a superuser or with sufficient privileges
- Check that the scripts are being executed in the correct database

### Function Conflicts
- If a function already exists with a different signature, you may need to drop it first
- Functions are created with `CREATE OR REPLACE` to minimize conflicts

### Table Errors
- For "relation does not exist" errors, ensure you've run the scripts in the correct order
- The ensure_base_tables.sql script should be run first to create all necessary tables

## Verification

After running the scripts, you can verify that all necessary tables were created:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('achievements', 'rewards', 'user_achievements', 'user_points', 'point_transactions', 'user_login_streaks', 'user_quiz_results', 'user_courses', 'user_lessons');
```

Check that the quiz questions all have appropriate options:
```sql
SELECT * FROM vw_quiz_questions_with_options WHERE option_count = 0;
```

Verify achievement functions and procedures:
```sql
SELECT proname FROM pg_proc WHERE proname LIKE '%achievement%' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

## Next Steps

After successful migration:
1. Test the achievement system by completing courses, lessons, or quizzes
2. Check if login streaks are being tracked properly
3. Verify incentive points are awarded correctly 
4. Test that quiz options display correctly on quiz pages 