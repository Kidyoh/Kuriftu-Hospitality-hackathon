# Setting Up User Analytics SQL Function in Supabase

This guide provides step-by-step instructions for implementing the user analytics function in your Supabase database.

## Step 1: Access SQL Editor

1. Log in to your Supabase dashboard
2. Navigate to the "SQL Editor" tab 
3. Click "New Query"

## Step 2: Run the Function Creation Script

Copy and paste the entire contents of `sql/user_analytics_function.sql` into the SQL editor.

The SQL file includes:
- Function drop statements to remove any existing versions
- The function definition with mock data 
- Permission grants for authenticated users and service roles

## Step 3: Execute the Query

Click the "Run" button to execute the SQL and create the function.

## Step 4: Test the Function

Test the function by running a sample query:

```sql
SELECT get_user_analytics('your-user-uuid-here'::uuid, 'month');
```

Replace `your-user-uuid-here` with an actual user UUID from your database.

## Step 5: Customize for Your Database Schema

The provided function uses mock data. To use real data from your database, you need to modify the SQL queries inside the function to match your actual table structure.

Look for these sections in the function and update them:

1. User info query:
   ```sql
   SELECT * INTO v_user FROM auth.users WHERE id = p_user_id;
   ```

2. Course enrollments:
   ```sql
   -- Update this with your actual tables
   SELECT 
     COUNT(DISTINCT e.course_id) AS total_enrolled,
     ...
   FROM 
     your_course_enrollments_table e
   WHERE 
     e.user_id = p_user_id;
   ```

3. Lessons completed:
   ```sql
   -- Update with your lesson progress tracking table
   SELECT 
     COUNT(*)
   INTO 
     total_lessons_completed
   FROM 
     your_lesson_progress_table lp
   WHERE 
     lp.user_id = p_user_id
     AND lp.completed = true;
   ```

4. Quiz attempts:
   ```sql
   -- Update with your quiz attempts table
   SELECT 
     COUNT(*),
     COALESCE(AVG(score), 0)
   INTO 
     total_quizzes_attempted,
     avg_quiz_score
   FROM 
     your_quiz_attempts_table qa
   WHERE 
     qa.user_id = p_user_id;
   ```

5. Course distribution:
   Replace the hardcoded JSON with a query that builds the JSON from your actual tables.

6. Recent activities:
   Replace the hardcoded JSON with an actual query that fetches recent user activities.

## Step 6: Update the React Component

The React component in `src/components/admin/UserAnalytics.tsx` has been updated to:

1. Try to fetch data from the SQL function first
2. Fall back to mock data if the function call fails
3. Handle date formatting safely to prevent errors

This approach allows you to gradually implement the backend functionality while maintaining a working UI.

## Troubleshooting

### Function Not Found Error

If you see an error like:
```
ERROR: 42883: function public.get_user_analytics(uuid) does not exist
```

It means:
1. The function was not created correctly, or
2. You're calling it with the wrong parameter types

Solutions:
- Make sure you use `::uuid` to cast string UUIDs
- Check that the function exists in the Supabase database
- Verify you've granted permissions correctly

### Data Type Issues

If you encounter data type errors:
- Check that your table column types match the function's expected types
- Use appropriate type casting in your queries
- Ensure JSON structures match the expected format

### Performance Considerations

For larger databases:
- Add appropriate indexes on user_id columns in relevant tables
- Consider adding a time limit for queries
- Add pagination for large result sets 